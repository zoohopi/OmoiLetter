begin;
-- Bootstrap administrators in the SQL Editor only. Never trust user_metadata.
create table public.admin_members (
 user_id uuid primary key references auth.users(id), enabled boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.admin_members enable row level security;
revoke all on public.admin_members from anon,authenticated;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_members where user_id=auth.uid() and enabled)
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;
alter table public.orders add column production_ordered_at timestamptz,
 add column production_ordered_by uuid references auth.users(id),
 add column production_note text not null default '' check(length(production_note)<=2000),
 add column admin_revision integer not null default 0;
create index orders_fulfillment on public.orders(status,created_at);
create table public.order_documents (
 order_id uuid not null references public.orders(id), template_version integer not null,
 object_path text not null, page_count integer not null check(page_count between 3 and 100),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 primary key(order_id,template_version), check(object_path like order_id::text||'/%')
);
create table public.order_admin_events (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 actor_id uuid not null references auth.users(id), action text not null, detail jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index order_admin_events_order on public.order_admin_events(order_id,created_at);
alter table public.order_documents enable row level security;
alter table public.order_admin_events enable row level security;
revoke all on public.order_documents,public.order_admin_events from anon,authenticated;
grant select,insert on public.order_documents to authenticated;
grant select on public.order_admin_events to authenticated;
create policy admin_order_read on public.orders for select to authenticated using((select public.is_admin()));
create policy admin_profile_read on public.profiles for select to authenticated using((select public.is_admin()));
create policy admin_shipment_read on public.shipments for select to authenticated using((select public.is_admin()));
create policy admin_documents_read on public.order_documents for select to authenticated using((select public.is_admin()));
create policy admin_documents_insert on public.order_documents for insert to authenticated with check((select public.is_admin()) and created_by=(select auth.uid()));
create policy admin_events_read on public.order_admin_events for select to authenticated using((select public.is_admin()));

create function public.admin_order_list(p_stage text default 'todo',p_search text default '',p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if p_stage not in ('todo','progress','done') or p_offset<0 or p_offset>100000 or length(p_search)>100 then
  raise exception 'Invalid filter' using errcode='22023'; end if;
 with filtered as (
  select o.id,o.order_number,o.user_id,o.status,o.shipping_address,o.created_at,o.production_ordered_at,o.admin_revision,
   coalesce(p.display_name,'') customer_name,coalesce(p.phone,'') customer_phone,u.email,
   (o.book_snapshot->'draft'->>'recipientName') book_name,
   exists(select 1 from public.order_documents d where d.order_id=o.id) pdf_ready
  from public.orders o left join public.profiles p on p.id=o.user_id left join auth.users u on u.id=o.user_id
  where ((p_stage='todo' and o.status in ('requested','awaiting_payment','paid')) or
   (p_stage='progress' and o.status in ('producing','shipped')) or (p_stage='done' and o.status in ('delivered','cancelled')))
   and (p_search='' or strpos(lower(concat_ws(' ',o.order_number,p.display_name,p.phone,u.email,o.shipping_address->>'recipient_name',o.shipping_address->>'phone')),lower(p_search))>0)
 ), paged as (select * from filtered order by created_at asc,id asc limit 50 offset p_offset)
 select jsonb_build_object('orders',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at,t.id) from paged t),'[]'::jsonb),
  'total',(select count(*) from filtered),
  'counts',jsonb_build_object('todo',(select count(*) from public.orders where status in ('requested','awaiting_payment','paid')),
   'progress',(select count(*) from public.orders where status in ('producing','shipped')),
   'done',(select count(*) from public.orders where status in ('delivered','cancelled')))) into result;
 return result;
end $$;

create function public.admin_order_detail(p_order_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 select jsonb_build_object('order',to_jsonb(o),'customer',jsonb_build_object('name',p.display_name,'phone',p.phone,'email',u.email),
  'shipments',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from public.shipments s where s.order_id=o.id),'[]'::jsonb),
  'documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.order_documents d where d.order_id=o.id),'[]'::jsonb),
  'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from public.order_admin_events e where e.order_id=o.id),'[]'::jsonb))
 into result from public.orders o left join public.profiles p on p.id=o.user_id left join auth.users u on u.id=o.user_id where o.id=p_order_id;
 return result;
end $$;

create function public.admin_update_order(p_order_id uuid,p_revision integer,p_action text,p_note text default '',p_carrier text default '',p_tracking text default '')
returns integer language plpgsql security definer set search_path='' as $$
declare o public.orders; next_revision integer;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if length(p_note)>2000 then raise exception 'Note too long' using errcode='22023'; end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'Order missing' using errcode='22023'; end if;
 if o.admin_revision<>p_revision then raise exception 'Order changed, reload' using errcode='40001'; end if;
 if p_action='mark_ordered' then
  if o.status not in ('requested','awaiting_payment','paid') then raise exception 'Already ordered' using errcode='22023'; end if;
  update public.orders set status='producing',production_ordered_at=now(),production_ordered_by=auth.uid(),production_note=p_note,admin_revision=admin_revision+1 where id=o.id;
 elsif p_action='mark_shipped' then
  if o.status<>'producing' or length(trim(p_carrier)) not between 1 and 50 or length(trim(p_tracking)) not between 4 and 60
   or p_tracking !~ '^[a-zA-Z0-9 -]+$' then raise exception 'Carrier and tracking required' using errcode='22023'; end if;
  insert into public.shipments(order_id,carrier,tracking_number,status,shipped_at) values(o.id,trim(p_carrier),trim(p_tracking),'shipped',now());
  update public.orders set status='shipped',admin_revision=admin_revision+1 where id=o.id;
 elsif p_action='mark_delivered' then
  if o.status<>'shipped' then raise exception 'Not shipped' using errcode='22023'; end if;
  update public.shipments set status='delivered',delivered_at=now() where order_id=o.id and status='shipped';
  update public.orders set status='delivered',admin_revision=admin_revision+1 where id=o.id;
 elsif p_action='save_note' then
  update public.orders set production_note=p_note,admin_revision=admin_revision+1 where id=o.id;
 else raise exception 'Invalid action' using errcode='22023';
 end if;
 insert into public.order_admin_events(order_id,actor_id,action,detail) values(o.id,auth.uid(),p_action,jsonb_build_object('previous_status',o.status,'note',p_note,'carrier',p_carrier,'tracking',p_tracking));
 select admin_revision into next_revision from public.orders where id=o.id;
 return next_revision;
end $$;
create function public.log_order_document() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.order_admin_events(order_id,actor_id,action,detail) values(new.order_id,new.created_by,'pdf_created',jsonb_build_object('version',new.template_version,'pages',new.page_count));
 return new;
end $$;
create trigger log_pdf_creation after insert on public.order_documents for each row execute function public.log_order_document();
revoke all on function public.admin_order_list(text,text,integer),public.admin_order_detail(uuid),public.admin_update_order(uuid,integer,text,text,text,text),public.log_order_document() from public,anon,authenticated;
grant execute on function public.admin_order_list(text,text,integer),public.admin_order_detail(uuid),public.admin_update_order(uuid,integer,text,text,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('order-pdfs','order-pdfs',false,157286400,array['application/pdf']);
create policy admin_snapshot_photo_read on storage.objects for select to authenticated using(bucket_id='book-photos' and (select public.is_admin())
 and exists(select 1 from public.orders o cross join lateral jsonb_array_elements(o.book_snapshot->'assets') a where a->>'object_path'=name));
create policy admin_pdf_read on storage.objects for select to authenticated using(bucket_id='order-pdfs' and (select public.is_admin()));
create policy admin_pdf_insert on storage.objects for insert to authenticated with check(bucket_id='order-pdfs' and (select public.is_admin())
 and exists(select 1 from public.orders where id::text=(storage.foldername(name))[1]));
commit;
