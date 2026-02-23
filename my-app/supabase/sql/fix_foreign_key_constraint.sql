-- Fix foreign key constraint to allow NULL user_id
-- This is important because guest uploads and uploads with invalid users should work

-- 1. First check current constraint state
SELECT '=== CURRENT CONSTRAINT STATE ===' as table_info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'documents'
    AND kcu.column_name = 'user_id';

-- 2. Check if user_id column allows NULL
SELECT '=== COLUMN NULLABILITY ===' as table_info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'documents'
  AND column_name = 'user_id';

-- 3. If user_id is NOT NULL, we need to alter it
DO $$ 
BEGIN
    -- Check if column is NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'documents' 
          AND column_name = 'user_id' 
          AND is_nullable = 'NO'
    ) THEN
        RAISE NOTICE 'Altering user_id column to allow NULL values...';
        
        -- First drop the foreign key constraint (we'll recreate it)
        ALTER TABLE public.documents 
        DROP CONSTRAINT IF EXISTS documents_user_id_fkey;
        
        -- Alter column to allow NULL
        ALTER TABLE public.documents 
        ALTER COLUMN user_id DROP NOT NULL;
        
        RAISE NOTICE 'user_id column now allows NULL values';
    ELSE
        RAISE NOTICE 'user_id column already allows NULL values';
    END IF;
END $$;

-- 4. Recreate foreign key constraint with proper rules
-- First, check if constraint already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'documents' 
          AND constraint_name = 'documents_user_id_fkey'
    ) THEN
        RAISE NOTICE 'Creating foreign key constraint...';
        
        ALTER TABLE public.documents 
        ADD CONSTRAINT documents_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint created with ON DELETE SET NULL';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- 5. Verify the changes
SELECT '=== FINAL VERIFICATION ===' as table_info;

-- Check column nullability
SELECT 
    'Column nullability' as check_item,
    column_name,
    is_nullable as allows_null
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'documents'
  AND column_name = 'user_id';

-- Check constraint
SELECT 
    'Foreign key constraint' as check_item,
    tc.constraint_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'documents'
  AND tc.constraint_name = 'documents_user_id_fkey';

-- 6. Update existing documents with invalid user_id to NULL
SELECT '=== FIXING EXISTING INVALID REFERENCES ===' as table_info;

WITH invalid_docs AS (
    SELECT d.id, d.file_name, d.user_id
    FROM public.documents d
    LEFT JOIN public.users u ON d.user_id = u.id
    WHERE d.user_id IS NOT NULL AND u.id IS NULL
)
SELECT 
    'Found ' || COUNT(*) || ' documents with invalid user_id' as message
FROM invalid_docs;

-- Actually fix them (uncomment when ready)
/*
UPDATE public.documents d
SET user_id = NULL
FROM (
    SELECT d.id
    FROM public.documents d
    LEFT JOIN public.users u ON d.user_id = u.id
    WHERE d.user_id IS NOT NULL AND u.id IS NULL
) AS invalid
WHERE d.id = invalid.id;
*/

-- 7. Test data
SELECT '=== TEST DATA ===' as table_info;

-- Insert a test document with NULL user_id (should work)
-- Create a unique path to avoid conflicts
WITH test_insert AS (
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
        'test-null-user-' || floor(random() * 1000000)::text,
        'test-null-user-' || floor(random() * 1000000)::text,
        'https://example.com/test',
        'text/plain',
        0,
        NOW(),
        NOW(),
        false,
        NULL,  -- NULL user_id
        'default'
    )
    RETURNING id, file_name, user_id
)
SELECT * FROM test_insert;

-- Clean up test data
DELETE FROM public.documents WHERE file_name LIKE 'test-null-user-%';

SELECT '=== FOREIGN KEY FIX COMPLETE ===' as table_info;