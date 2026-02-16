-- Run this in Supabase SQL editor to create the `documents` table

create table if not exists public.documents (
  id uuid default uuid_generate_v4() primary key,
  file_name text not null,
  path text not null,
  public_url text,
  file_type text,
  size bigint,
  uploaded_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  is_deleted boolean default false,
  deleted_at timestamp with time zone,
  summary text,
  summary_source text,
  summary_model text,
  summary_generated_at timestamp with time zone
);

-- Optional: index on path for quick lookups
create index if not exists idx_documents_path on public.documents (path);

-- Index for soft delete queries
create index if not exists idx_documents_is_deleted on public.documents (is_deleted);

-- Index for fast sorting by created time
create index if not exists idx_documents_created_at on public.documents (created_at desc);
