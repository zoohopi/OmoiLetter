-- 내지 사진 최대 19장 제한 제거(최소 9장만 유지), 편지만 있는 페이지 허용.
-- 페이지 수 상한은 남용 방지용 500으로 둔다. (30장 이상 가격 증가는 결제 단계에서 처리 예정)
begin;
create or replace function public.save_my_book(p_id uuid,p_expected_revision integer,p_draft jsonb,p_assets jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); current_book public.books; next_revision integer;
  asset jsonb; photo_key text; required_ids text[];
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if jsonb_typeof(p_draft) is distinct from 'object' or (p_draft->>'version') is distinct from '1'
    or coalesce(p_draft->>'status','') not in ('draft','submitted') or octet_length(p_draft::text)>2097152
    or jsonb_typeof(p_assets) is distinct from 'object' then raise exception 'Invalid book' using errcode='22023'; end if;
  if p_draft ? 'bookPhotos' and (jsonb_typeof(p_draft->'bookPhotos') is distinct from 'array' or jsonb_array_length(p_draft->'bookPhotos')>500) then
    raise exception 'Invalid pages' using errcode='22023'; end if;
  select * into current_book from public.books where id=p_id for update;
  if found then
    if current_book.user_id<>uid then raise exception 'Forbidden' using errcode='42501'; end if;
    if current_book.revision<>p_expected_revision then raise exception 'A newer revision exists' using errcode='40001'; end if;
    if current_book.draft=p_draft then return current_book.revision; end if;
    if current_book.status='submitted' or exists(select 1 from public.orders where book_id=p_id) then
      raise exception 'Submitted book is locked' using errcode='42501'; end if;
    next_revision:=current_book.revision+1;
  else
    if p_expected_revision<>0 then raise exception 'Revision conflict' using errcode='40001'; end if;
    next_revision:=1;
  end if;
  select array_agg(distinct id) into required_ids from (
    select p_draft->>'coverPhotoId' id
    union all select v->>'photoId' from jsonb_array_elements(coalesce(p_draft->'bookPhotos','[]'::jsonb)) v
    union all select value from jsonb_each_text(coalesce(p_draft->'photoByQuestion','{}'::jsonb))
  ) ids where id is not null and id<>'';
  foreach photo_key in array coalesce(required_ids,array[]::text[]) loop
    if not (p_assets ? photo_key) then raise exception 'Photo is missing' using errcode='22023'; end if;
  end loop;
  for photo_key,asset in select key,value from jsonb_each(p_assets) loop
    if length(photo_key)>200 or asset->>'path' not like uid::text||'/'||p_id::text||'/%'
      or coalesce(asset->>'mime','') not in ('image/jpeg','image/png','image/webp')
      or coalesce((asset->>'size')::bigint,0) not between 1 and 26214400
      or not exists(select 1 from storage.objects where bucket_id='book-photos' and name=asset->>'path') then
      raise exception 'Invalid photo' using errcode='22023'; end if;
  end loop;
  insert into public.books(id,user_id,title,status,draft,revision)
    values(p_id,uid,left(coalesce(nullif(p_draft->>'recipientName',''),'나의 편지책'),100),p_draft->>'status',p_draft,next_revision)
    on conflict(id) do update set title=excluded.title,status=excluded.status,draft=excluded.draft,revision=excluded.revision,updated_at=now()
      where public.books.user_id=uid and public.books.revision=p_expected_revision and public.books.status='draft'
    returning revision into next_revision;
  if not found then raise exception 'Concurrent save conflict' using errcode='40001'; end if;
  delete from public.book_assets where book_id=p_id;
  insert into public.book_assets(book_id,user_id,photo_id,object_path,mime_type,byte_size)
    select p_id,uid,key,value->>'path',value->>'mime',(value->>'size')::bigint from jsonb_each(p_assets);
  return next_revision;
end $$;

create or replace function public.request_book_order(p_book_id uuid,p_address_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); b public.books; a public.addresses; result uuid;
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into b from public.books where id=p_book_id and user_id=uid for update;
  if not found then raise exception 'Invalid book' using errcode='22023'; end if;
  select id into result from public.orders where book_id=b.id and user_id=uid;
  if found then return result; end if; -- Idempotent retries / double taps.
  select * into a from public.addresses where id=p_address_id and user_id=uid;
  if not found or b.status<>'submitted' or coalesce(b.draft->>'coverPhotoId','')='' or
    (select count(*) from jsonb_array_elements(coalesce(b.draft->'bookPhotos','[]'::jsonb)) p where coalesce(p->>'photoId','')<>'')<9 or
    exists(select 1 from jsonb_array_elements(coalesce(b.draft->'bookPhotos','[]'::jsonb)) p
      where case when coalesce(p->>'photoId','')=''
        -- 편지만 있는 페이지: 그 페이지에 배치된 편지가 있어야 한다
        then not exists(select 1 from jsonb_array_elements(coalesce(b.draft->'letters','[]'::jsonb)) l where l->>'pageId'=p->>'id')
        else not exists(select 1 from public.book_assets ba where ba.book_id=b.id and ba.photo_id=p->>'photoId') end) or
    not exists(select 1 from jsonb_array_elements(coalesce(b.draft->'letters','[]'::jsonb)) l
      where length(trim(coalesce(l->>'answer','')))>0 and length(trim(coalesce(l->>'question','')))>0
      and exists(select 1 from jsonb_array_elements(b.draft->'bookPhotos') p where p->>'id'=l->>'pageId'))
    then raise exception 'Complete book and address required' using errcode='22023'; end if;
  insert into public.orders(user_id,book_id,book_snapshot,shipping_address)
    values(uid,b.id,jsonb_build_object('draft',b.draft,'assets',(select jsonb_agg(to_jsonb(ba)) from public.book_assets ba where ba.book_id=b.id)),
      jsonb_build_object('recipient_name',a.recipient_name,'phone',a.phone,'postal_code',a.postal_code,'address1',a.address1,'address2',a.address2,'delivery_note',a.delivery_note))
    returning id into result;
  return result;
end $$;
commit;
