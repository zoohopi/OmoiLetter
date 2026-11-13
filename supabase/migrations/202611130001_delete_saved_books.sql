begin;
create or replace function public.delete_my_book(p_book_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform 1 from public.books where id=p_book_id and user_id=uid for update;
  if not found then raise exception 'Book not found' using errcode='22023'; end if;
  if exists(select 1 from public.orders where book_id=p_book_id) then
    raise exception 'Ordered books cannot be deleted' using errcode='23503';
  end if;
  delete from public.books where id=p_book_id and user_id=uid;
end $$;
revoke all on function public.delete_my_book(uuid) from public,anon;
grant execute on function public.delete_my_book(uuid) to authenticated;
commit;
