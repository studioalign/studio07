create policy "allow 1uy07ed_0"
on "storage"."objects"
as permissive
for select
to authenticated
using ((bucket_id = 'user_photos'::text));
create policy "allow 1uy07ed_1"
on "storage"."objects"
as permissive
for insert
to authenticated
with check ((bucket_id = 'user_photos'::text));
create policy "allow 1uy07ed_2"
on "storage"."objects"
as permissive
for delete
to authenticated
using ((bucket_id = 'user_photos'::text));
create policy "allow 1uy07ed_3"
on "storage"."objects"
as permissive
for update
to authenticated
using ((bucket_id = 'user_photos'::text));
