-- Fix RLS policies to allow user registration
-- Run this after the main update_database_v2.sql

-- First, drop the existing restrictive policies
drop policy if exists "Only admins can manage users" on public.users;
drop policy if exists "Users can view their own profile" on public.users;

-- Create new RLS policies for users table
-- 1. Allow anyone to insert new users (registration)
create policy "Allow user registration" on public.users
for insert with check (true);

-- 2. Allow anyone to select users (needed for login and duplicate checking)
-- In production, you might want to restrict this more
create policy "Allow user lookup" on public.users
for select using (true);

-- 3. Allow users to update their own profile
-- Note: Role changes should be prevented at application level or via trigger
create policy "Users can update own profile" on public.users
for update using (auth.uid() = id);

-- 4. Only admins can delete users
create policy "Only admins can delete users" on public.users
for delete using (role = 'admin');

-- Note: The 'auth.uid() = id' condition in select policy would prevent
-- anonymous users from checking if a user exists. We need anonymous
-- access for registration duplicate checking and login verification.
-- That's why we use 'using (true)' for select.