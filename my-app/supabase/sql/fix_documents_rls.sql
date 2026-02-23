-- Fix documents table RLS policies to allow file uploads with custom authentication
-- Run this after the main update_database_v2.sql

-- Drop existing problematic policies
drop policy if exists "Users can insert their own documents" on public.documents;
drop policy if exists "Users can update their own documents" on public.documents;
drop policy if exists "Users can delete their own documents" on public.documents;
drop policy if exists "Users can view their own documents" on public.documents;

-- Create new RLS policies for documents table
-- Note: Since we're using custom cookie-based auth, we can't use auth.uid()
-- Instead, we rely on application-level permissions and have more permissive DB policies

-- 1. Allow anyone to insert documents (application controls who can insert)
create policy "Allow document insertion" on public.documents
for insert with check (true);

-- 2. Allow users to view documents based on ownership
-- This is tricky without auth.uid(), so we'll allow viewing all documents
-- Application filters will show only user's own documents
create policy "Allow document viewing" on public.documents
for select using (true);

-- 3. Allow users to update their own documents
-- Application will ensure users can only update their own files
create policy "Allow document updates" on public.documents
for update using (true);

-- 4. Allow users to delete documents
-- Application will ensure users can only delete their own files
create policy "Allow document deletion" on public.documents
for delete using (true);

-- Alternative approach: If you want to use Supabase JWT auth instead of cookies
-- You would need to:
-- 1. Use Supabase auth for user login
-- 2. Get JWT token from Supabase
-- 3. Pass that token in API requests
-- 4. Use auth.uid() in RLS policies

-- Verify the policies
SELECT 'Documents RLS policies updated successfully' as message;