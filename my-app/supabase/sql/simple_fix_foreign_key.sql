-- Simple fix for foreign key constraint
-- This script directly fixes the issues without complex logic

-- 1. First, let's see the current state
SELECT '=== CURRENT STATE ===' as info;

-- Check if user_id allows NULL
SELECT 
    'user_id column' as check_item,
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'documents'
  AND column_name = 'user_id';

-- Check foreign key constraint
SELECT 
    'foreign key' as check_item,
    tc.constraint_name,
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
    AND tc.table_name = 'documents'
    AND kcu.column_name = 'user_id';

-- 2. Drop the foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'documents' 
          AND constraint_name = 'documents_user_id_fkey'
    ) THEN
        ALTER TABLE public.documents 
        DROP CONSTRAINT documents_user_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint: documents_user_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint does not exist';
    END IF;
END $$;

-- 3. Make sure user_id column allows NULL
DO $$ 
BEGIN
    -- Check current state
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'documents' 
          AND column_name = 'user_id' 
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.documents 
        ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE 'Changed user_id column to allow NULL values';
    ELSE
        RAISE NOTICE 'user_id column already allows NULL values';
    END IF;
END $$;

-- 4. Recreate foreign key constraint with proper settings
ALTER TABLE public.documents 
ADD CONSTRAINT documents_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

SELECT 'Created foreign key constraint with ON DELETE SET NULL' as info;

-- 5. Test the fix
SELECT '=== TESTING FIX ===' as info;

-- Test 1: Insert with NULL user_id (should work for guest)
INSERT INTO public.documents (
    file_name,
    path,
    public_url,
    file_type,
    size,
    uploaded_at,
    created_at,
    is_deleted,
    user_id,
    bucket_name
) VALUES (
    'guest-test-file.txt',
    'guest-test-file.txt',
    'https://example.com/guest',
    'text/plain',
    100,
    NOW(),
    NOW(),
    false,
    NULL,
    'default'
) RETURNING id, file_name, user_id;

-- Test 2: Insert with valid user_id (should work for registered users)
-- Use the test user from the users table
INSERT INTO public.documents (
    file_name,
    path,
    public_url,
    file_type,
    size,
    uploaded_at,
    created_at,
    is_deleted,
    user_id,
    bucket_name
) VALUES (
    'user-test-file.txt',
    'user-test-file.txt',
    'https://example.com/user',
    'text/plain',
    200,
    NOW(),
    NOW(),
    false,
    '38a0b566-9a5e-4ad7-8b86-caed91dcdd79',  -- test1@example.com user ID
    'default'
) RETURNING id, file_name, user_id;

-- 6. Clean up test data
DELETE FROM public.documents WHERE file_name IN ('guest-test-file.txt', 'user-test-file.txt');

-- 7. Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

-- Check column nullability
SELECT 
    'user_id nullability' as check_item,
    CASE WHEN is_nullable = 'YES' THEN '✅ Allows NULL' ELSE '❌ Does not allow NULL' END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'documents'
  AND column_name = 'user_id';

-- Check constraint exists
SELECT 
    'foreign key constraint' as check_item,
    CASE WHEN COUNT(*) > 0 THEN '✅ Exists' ELSE '❌ Missing' END as status
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
  AND table_name = 'documents' 
  AND constraint_name = 'documents_user_id_fkey';

-- Show some sample data
SELECT '=== SAMPLE DATA (last 5 documents) ===' as info;
SELECT 
    id,
    file_name,
    user_id,
    bucket_name,
    created_at
FROM public.documents 
ORDER BY created_at DESC 
LIMIT 5;