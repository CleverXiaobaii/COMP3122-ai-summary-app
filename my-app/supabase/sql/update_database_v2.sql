-- Database schema update for user authentication and file ownership
-- Version 2: Add users table, logs table, and update documents table

-- 1. Create users table
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  password_hash text not null,
  username text unique not null,
  display_name text,
  role text default 'user' check (role in ('user', 'admin', 'guest')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_active boolean default true
);

-- Create indexes for users table
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_users_username on public.users (username);
create index if not exists idx_users_role on public.users (role);

-- Insert default admin user (password: admin123)
-- Note: In production, you should change this password!
-- Using MD5 hash for simplicity during development
insert into public.users (email, password_hash, username, display_name, role)
values ('admin@example.com', md5('admin123' || 'default-salt'), 'admin', 'Administrator', 'admin')
on conflict (email) do nothing;

-- Insert default guest user with fixed UUID
insert into public.users (id, email, password_hash, username, display_name, role)
values ('a14ef943-e5d3-4a17-b4cb-293181ec1d7e', 'guest@example.com', md5('guest123' || 'default-salt'), 'guest', 'Guest User', 'guest')
on conflict (id) do update set 
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- 2. Create logs table
create table if not exists public.logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete set null,
  action_type text not null check (action_type in ('login', 'logout', 'file_upload', 'file_delete', 'summary_generate')),
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamp with time zone default now()
);

-- Create indexes for logs table
create index if not exists idx_logs_user_id on public.logs (user_id);
create index if not exists idx_logs_action_type on public.logs (action_type);
create index if not exists idx_logs_created_at on public.logs (created_at desc);

-- 3. Update documents table to add user_id and bucket_name
-- First, add new columns to documents table
alter table public.documents 
add column if not exists user_id uuid references public.users(id) on delete set null,
add column if not exists bucket_name text default 'default';

-- Update existing documents to assign to guest user (since they were uploaded by guest/unknown users)
update public.documents 
set user_id = (select id from public.users where username = 'guest')
where user_id is null;

-- Create indexes for new columns
create index if not exists idx_documents_user_id on public.documents (user_id);
create index if not exists idx_documents_bucket_name on public.documents (bucket_name);

-- 4. Enable Row Level Security (RLS) on all tables
alter table public.users enable row level security;
alter table public.logs enable row level security;
alter table public.documents enable row level security;

-- 5. Create RLS policies for users table
-- Users can read their own profile
create policy "Users can view their own profile" on public.users
for select using (auth.uid() = id or role = 'admin');

-- Only admins can insert/update/delete users (except self-registration handled by app)
create policy "Only admins can manage users" on public.users
for all using (role = 'admin');

-- 6. Create RLS policies for logs table
-- Users can view their own logs
create policy "Users can view their own logs" on public.logs
for select using (auth.uid() = user_id or (select role from public.users where id = auth.uid()) = 'admin');

-- App can insert logs for any user
create policy "App can insert logs" on public.logs
for insert with check (true);

-- 7. Create RLS policies for documents table
-- Users can view their own documents
create policy "Users can view their own documents" on public.documents
for select using (
  auth.uid() = user_id 
  or bucket_name = 'default'
  or (select role from public.users where id = auth.uid()) = 'admin'
);

-- Users can insert their own documents
create policy "Users can insert their own documents" on public.documents
for insert with check (
  auth.uid() = user_id 
  or (bucket_name = 'default' and auth.uid() is null) -- guest uploads to default
);

-- Users can update their own documents
create policy "Users can update their own documents" on public.documents
for update using (
  auth.uid() = user_id 
  or (select role from public.users where id = auth.uid()) = 'admin'
);

-- Users can delete their own documents
create policy "Users can delete their own documents" on public.documents
for delete using (
  auth.uid() = user_id 
  or (bucket_name = 'default' and auth.uid() is null) -- guest can delete from default
  or (select role from public.users where id = auth.uid()) = 'admin'
);

-- 8. Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for users table
drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at
before update on public.users
for each row
execute function update_updated_at_column();

-- 9. Create function to get user bucket name
create or replace function get_user_bucket_name(user_id_param uuid)
returns text as $$
declare
  bucket_name text;
begin
  if user_id_param is null then
    return 'default';
  else
    select 'user-' || id into bucket_name
    from public.users
    where id = user_id_param;
    
    if bucket_name is null then
      return 'default';
    else
      return bucket_name;
    end if;
  end if;
end;
$$ language plpgsql;

-- 10. Create helper function for logging
create or replace function log_user_action(
  user_id_param uuid,
  action_type_param text,
  ip_address_param text default null,
  user_agent_param text default null,
  details_param jsonb default null
)
returns uuid as $$
declare
  log_id uuid;
begin
  insert into public.logs (user_id, action_type, ip_address, user_agent, details)
  values (user_id_param, action_type_param, ip_address_param, user_agent_param, details_param)
  returning id into log_id;
  
  return log_id;
end;
$$ language plpgsql;