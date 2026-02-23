-- Check current RLS policies status for debugging
-- Run this to see what policies are currently active

SELECT '=== USERS TABLE POLICIES ===' as table_info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

SELECT '=== DOCUMENTS TABLE POLICIES ===' as table_info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'documents' 
ORDER BY policyname;

SELECT '=== LOGS TABLE POLICIES ===' as table_info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'logs' 
ORDER BY policyname;

-- Check if RLS is enabled on tables
SELECT '=== RLS ENABLED STATUS ===' as table_info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'documents', 'logs')
ORDER BY tablename;

-- Count records in each table for reference
SELECT '=== TABLE RECORD COUNTS ===' as table_info;
SELECT 'users' as table_name, COUNT(*) as record_count FROM public.users
UNION ALL
SELECT 'documents' as table_name, COUNT(*) as record_count FROM public.documents
UNION ALL
SELECT 'logs' as table_name, COUNT(*) as record_count FROM public.logs;