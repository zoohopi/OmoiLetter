-- 텍스트 표지(사진 없는 표지)도 주문할 수 있게 한다. 사진 표지는 여전히 표지 사진이 필요하다.
begin;
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
  if not found or b.status<>'submitted' or (coalesce(b.draft->>'coverType','photo')<>'text' and coalesce(b.draft->>'coverPhotoId','')='') or
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
