-- Fix guest user ID to match the fixed UUID used in the application
-- Run this after running the main update_database_v2.sql script if needed

-- First, delete any existing guest user with wrong ID (if exists)
delete from public.users where username = 'guest' and id != 'a14ef943-e5d3-4a17-b4cb-293181ec1d7e';

-- Insert or update guest user with correct fixed UUID
insert into public.users (id, email, password_hash, username, display_name, role, is_active)
values ('a14ef943-e5d3-4a17-b4cb-293181ec1d7e', 'guest@example.com', crypt('guest123', gen_salt('bf')), 'guest', 'Guest User', 'guest', true)
on conflict (id) do update set 
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Also update documents table to point to the correct guest user ID
-- This updates documents that have user_id pointing to any guest user (by username)
update public.documents 
set user_id = 'a14ef943-e5d3-4a17-b4cb-293181ec1d7e'
where user_id in (select id from public.users where username = 'guest' and id != 'a14ef943-e5d3-4a17-b4cb-293181ec1d7e');

-- Also update documents with null user_id to point to guest user
update public.documents 
set user_id = 'a14ef943-e5d3-4a17-b4cb-293181ec1d7e'
where user_id is null;

-- Verify the fix
select 'Guest user check:' as check_description;
select id, email, username, role from public.users where username = 'guest';

select 'Documents owned by guest:' as check_description;
select count(*) as document_count, 
       sum(case when user_id = 'a14ef943-e5d3-4a17-b4cb-293181ec1d7e' then 1 else 0 end) as owned_by_correct_guest,
       sum(case when user_id is null then 1 else 0 end) as null_user_id
from public.documents;