begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 50),
  phone text not null default '' check (length(phone) <= 20),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.books (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, status text not null check(status in ('draft','submitted')),
  draft jsonb not null check(jsonb_typeof(draft)='object'), revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,user_id)
);
create index books_owner on public.books(user_id,updated_at desc);
create table public.book_assets (
  book_id uuid not null, user_id uuid not null,
  photo_id text not null check(length(photo_id) between 1 and 200),
  object_path text not null, mime_type text not null, byte_size bigint not null check(byte_size between 1 and 26214400),
  primary key(book_id,photo_id), foreign key(book_id,user_id) references public.books(id,user_id) on delete cascade
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check(length(label) between 1 and 30),
  recipient_name text not null check(length(recipient_name) between 1 and 50),
  phone text not null check(phone ~ '^[0-9+() -]{8,20}$'),
  postal_code text not null check(postal_code ~ '^\d{5}$'),
  address1 text not null check(length(address1) between 3 and 200), address2 text not null default '' check(length(address2)<=200),
  delivery_note text not null default '' check(length(delivery_note)<=200),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index addresses_owner on public.addresses(user_id);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('OM-' || upper(replace(gen_random_uuid()::text,'-',''))),
  user_id uuid not null references auth.users(id), book_id uuid not null unique,
  status text not null default 'requested' check(status in ('requested','awaiting_payment','paid','producing','shipped','delivered','cancelled')),
  book_snapshot jsonb not null, shipping_address jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(book_id,user_id) references public.books(id,user_id)
);
create index orders_owner on public.orders(user_id,created_at desc);
create table public.shipments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
  carrier text, tracking_number text, status text not null default 'preparing' check(status in ('preparing','shipped','delivered','returned')),
  shipped_at timestamptz, delivered_at timestamptz, created_at timestamptz not null default now()
);
create index shipments_order on public.shipments(order_id);

create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_addresses before update on public.addresses for each row execute function public.touch_updated_at();
create trigger touch_orders before update on public.orders for each row execute function public.touch_updated_at();
create function public.new_member_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),50)) on conflict do nothing;
  return new;
end $$;
create trigger on_member_signup after insert on auth.users for each row execute function public.new_member_profile();
insert into public.profiles(id,display_name) select id,left(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),50) from auth.users on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.book_assets enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.shipments enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_insert on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy book_read on public.books for select to authenticated using(user_id=(select auth.uid()));
create policy assets_read on public.book_assets for select to authenticated using(user_id=(select auth.uid()));
create policy address_read on public.addresses for select to authenticated using(user_id=(select auth.uid()));
create policy address_insert on public.addresses for insert to authenticated with check(user_id=(select auth.uid()));
create policy address_update on public.addresses for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy address_delete on public.addresses for delete to authenticated using(user_id=(select auth.uid()));
create policy order_read on public.orders for select to authenticated using(user_id=(select auth.uid()));
create policy shipment_read on public.shipments for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));
revoke all on public.profiles,public.books,public.book_assets,public.addresses,public.orders,public.shipments from anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,insert,update,delete on public.addresses to authenticated;
grant select on public.books,public.book_assets,public.orders,public.shipments to authenticated;

-- The client cannot set ownership, revisions or production/payment states.
-- Optimistic revisions prevent a stale tab/device from overwriting a newer book.
create function public.save_my_book(p_id uuid,p_expected_revision integer,p_draft jsonb,p_assets jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); current_book public.books; next_revision integer;
  asset jsonb; photo_key text; required_ids text[];
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if jsonb_typeof(p_draft) is distinct from 'object' or (p_draft->>'version') is distinct from '1'
    or coalesce(p_draft->>'status','') not in ('draft','submitted') or octet_length(p_draft::text)>2097152
    or jsonb_typeof(p_assets) is distinct from 'object' then raise exception 'Invalid book' using errcode='22023'; end if;
  if p_draft ? 'bookPhotos' and (jsonb_typeof(p_draft->'bookPhotos') is distinct from 'array' or jsonb_array_length(p_draft->'bookPhotos')>19) then
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

create function public.request_book_order(p_book_id uuid,p_address_id uuid)
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
    jsonb_array_length(coalesce(b.draft->'bookPhotos','[]'::jsonb)) not between 9 and 19 or
    exists(select 1 from jsonb_array_elements(coalesce(b.draft->'bookPhotos','[]'::jsonb)) p
      where coalesce(p->>'photoId','')='' or not exists(select 1 from public.book_assets ba where ba.book_id=b.id and ba.photo_id=p->>'photoId')) or
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
revoke all on function public.save_my_book(uuid,integer,jsonb,jsonb),public.request_book_order(uuid,uuid),public.new_member_profile(),public.touch_updated_at() from public,anon,authenticated;
grant execute on function public.save_my_book(uuid,integer,jsonb,jsonb),public.request_book_order(uuid,uuid) to authenticated;

-- Originals are private. No public URLs; RLS also protects storage downloads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('book-photos','book-photos',false,26214400,array['image/jpeg','image/png','image/webp']);
create policy book_photo_read on storage.objects for select to authenticated
 using(bucket_id='book-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy book_photo_insert on storage.objects for insert to authenticated
 with check(bucket_id='book-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- No browser overwrite/delete of historical images referenced by an order.
commit;
