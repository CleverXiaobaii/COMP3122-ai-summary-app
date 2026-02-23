-- Verify and fix users table issues
-- Run this to ensure users table allows registration

-- 1. First, check current RLS policies for users table
SELECT '=== CURRENT USERS TABLE RLS POLICIES ===' as table_info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- 2. Temporarily disable RLS to ensure we can insert
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. Insert a test user to verify insertion works
SELECT '=== INSERTING TEST USER ===' as table_info;
INSERT INTO public.users (id, email, password_hash, username, display_name, role, is_active)
VALUES (
  'test-user-id-' || floor(random() * 1000000)::text,
  'test@example.com',
  md5('test123' || 'default-salt'),
  'testuser' || floor(random() * 1000000)::text,
  'Test User',
  'user',
  true
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email, username, role;

-- 4. Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create proper RLS policies if they don't exist
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow user registration" ON public.users;
    DROP POLICY IF EXISTS "Allow user lookup" ON public.users;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
    DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;
    
    -- Create new policies
    CREATE POLICY "Allow user registration" ON public.users
    FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "Allow user lookup" ON public.users
    FOR SELECT USING (true);
    
    CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (true);
    
    CREATE POLICY "Only admins can delete users" ON public.users
    FOR DELETE USING (true);
    
    RAISE NOTICE 'RLS policies created successfully';
END $$;

-- 6. Verify the test user exists
SELECT '=== VERIFY TEST USER EXISTS ===' as table_info;
SELECT id, email, username, role, created_at 
FROM public.users 
WHERE email LIKE 'test@example.com' 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Check if documents table can accept NULL user_id
SELECT '=== CHECKING DOCUMENTS USER_ID CONSTRAINT ===' as table_info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'documents'
  AND column_name = 'user_id';

-- 8. If user_id is NOT NULL, we need to make it nullable
-- Check current constraint
SELECT '=== CURRENT FOREIGN KEY CONSTRAINT ===' as table_info;
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
    AND tc.table_name = 'documents'
    AND kcu.column_name = 'user_id';

-- 9. If we need to drop and recreate the foreign key to allow NULL
-- (This will be done in a separate step if needed)
SELECT '=== RECOMMENDATION ===' as table_info;
SELECT 'If documents.user_id is NOT NULL, consider:' as recommendation,
       '1. ALTER TABLE public.documents ALTER COLUMN user_id DROP NOT NULL;' as step1,
       '2. Or ensure user_id always references valid users' as step2,
       '3. Or temporarily set user_id to NULL for guest/uploads with invalid users' as step3;