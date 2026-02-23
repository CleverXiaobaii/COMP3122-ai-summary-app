-- Simple fix for RLS policies to allow user registration
-- Run this to fix the "missing FROM-clause entry for table 'old'" error

-- Drop existing problematic policies if they exist
drop policy if exists "Only admins can manage users" on public.users;
drop policy if exists "Users can view their own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;

-- Create new RLS policies for users table
-- 1. Allow anyone to insert new users (registration)
create policy "Allow user registration" on public.users
for insert with check (true);

-- 2. Allow anyone to select users (needed for login and duplicate checking)
create policy "Allow user lookup" on public.users
for select using (true);

-- 3. Allow users to update their own profile
create policy "Users can update own profile" on public.users
for update using (auth.uid() = id);

-- 4. Only admins can delete users
create policy "Only admins can delete users" on public.users
for delete using (role = 'admin');

-- Verify the policies
SELECT 'RLS policies updated successfully' as message;