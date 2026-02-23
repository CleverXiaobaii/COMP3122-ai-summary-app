-- Check foreign key constraints and table structure
-- Run this to understand the foreign key issue

-- 1. Check the structure of documents table
SELECT '=== DOCUMENTS TABLE STRUCTURE ===' as table_info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documents'
ORDER BY ordinal_position;

-- 2. Check foreign key constraints on documents table
SELECT '=== DOCUMENTS FOREIGN KEYS ===' as table_info;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'documents';

-- 3. Check users table structure (for reference)
SELECT '=== USERS TABLE STRUCTURE ===' as table_info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. Count records in both tables
SELECT '=== TABLE RECORD COUNTS ===' as table_info;
SELECT 'users' as table_name, COUNT(*) as record_count FROM public.users
UNION ALL
SELECT 'documents' as table_name, COUNT(*) as record_count FROM public.documents;

-- 5. Show sample users (first 10)
SELECT '=== SAMPLE USERS ===' as table_info;
SELECT id, email, username, role, created_at FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Show sample documents with user info
SELECT '=== SAMPLE DOCUMENTS WITH USER INFO ===' as table_info;
SELECT 
    d.id,
    d.file_name,
    d.user_id,
    d.bucket_name,
    d.created_at,
    u.email as user_email,
    u.username,
    u.role as user_role
FROM public.documents d
LEFT JOIN public.users u ON d.user_id = u.id
ORDER BY d.created_at DESC
LIMIT 10;

-- 7. Check if there are any documents with invalid user_id
SELECT '=== DOCUMENTS WITH INVALID USER_ID (not in users table) ===' as table_info;
SELECT 
    d.id,
    d.file_name,
    d.user_id,
    d.created_at
FROM public.documents d
LEFT JOIN public.users u ON d.user_id = u.id
WHERE d.user_id IS NOT NULL AND u.id IS NULL;

-- 8. Check guest user exists
SELECT '=== GUEST USER CHECK ===' as table_info;
SELECT 
    id,
    email,
    username,
    role,
    is_active
FROM public.users 
WHERE username = 'guest' OR id = 'a14ef943-e5d3-4a17-b4cb-293181ec1d7e';