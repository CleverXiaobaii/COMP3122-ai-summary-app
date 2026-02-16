# Supabase Database Setup Guide

## Overview
This document provides step-by-step instructions to set up the Postgres database in Supabase for storing document information and AI-generated summaries.

## Prerequisites
- Supabase account created
- Project linked to the application
- Environment variables configured in `.env.local`

## Setup Steps

### Step 1: Create the Documents Table

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the following SQL:

```sql
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
```

5. Click **Run** to execute the query
6. You should see the message: "Success. No rows returned"

### Step 2: Configure RLS (Row Level Security) - Optional for Development

For development/testing, you can disable RLS temporarily:

1. In your Supabase project, go to **Authentication > Policies**
2. Find the `documents` table
3. Click on it and disable RLS if needed (for development only)

For production, set up proper RLS policies:

```sql
-- Allow all operations for authenticated users (adjust as needed)
alter table documents enable row level security;

create policy "Allow authenticated users to read" on documents
  for select using (true);

create policy "Allow authenticated users to insert" on documents
  for insert with check (true);

create policy "Allow authenticated users to update" on documents
  for update using (true);

create policy "Allow authenticated users to delete" on documents
  for delete using (true);
```

### Step 3: Test the Connection

1. Start the development server:
   ```bash
   cd my-app
   npm run dev
   ```

2. Open http://localhost:3000 in your browser

3. You should see the connection status indicator turn green with "✅ Supabase 已连接"

## Database Schema

### documents Table

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| file_name | text | Original file name |
| path | text | Storage path in bucket |
| public_url | text | Public URL to access the file |
| file_type | text | MIME type of the file |
| size | bigint | File size in bytes |
| uploaded_at | timestamp | When file was uploaded |
| created_at | timestamp | Record creation timestamp |
| is_deleted | boolean | Soft delete flag |
| deleted_at | timestamp | When file was soft-deleted |
| summary | text | AI-generated summary |
| summary_source | text | Source of summary (e.g., 'deepseek', 'local') |
| summary_model | text | Model used for summary (e.g., 'deepseek-chat') |
| summary_generated_at | timestamp | When summary was generated |

## Key Features

### Soft Delete
Files are marked as deleted (is_deleted=true) instead of permanently removed from the database, allowing for recovery if needed.

### Metadata Tracking
Every uploaded document is automatically tracked with:
- File size
- Creation timestamp
- File type
- Public URL for access

### AI Summary Integration
Generated summaries are stored along with:
- Summary content
- Source (which AI service generated it)
- Model version used
- Generation timestamp

## API Endpoints

### Upload File
- **Endpoint**: `POST /api/upload`
- **Body**: FormData with `file` and optional `bucket` fields
- **Response**: Document metadata including size and documentId

### List Files
- **Endpoint**: `GET /api/files/list`
- **Response**: Array of documents with all metadata from database

### Delete File
- **Endpoint**: `DELETE /api/files/delete`
- **Body**: `{ path: string, bucket: string }`
- **Result**: Soft delete in database + storage deletion

### Generate Summary
- **Endpoint**: `POST /api/summarize`
- **Body**: `{ fileUrl: string, fileName: string, fileType: string }`
- **Result**: Summary saved to database

## Troubleshooting

### "Failed to insert document metadata"
- Check RLS policies are allowing inserts
- Verify environment variables are correct
- Ensure the documents table exists

### "Connection Status: ❌"
- Verify Supabase URL and anonymous key in `.env.local`
- Check if the API endpoint `/api/supabase/connect` is accessible
- Look at browser console for detailed error messages

### Summaries not being saved
- Ensure `DEEPSEEK_API_KEY` is set if you want to use Deepseek
- Check that the database table allows UPDATE operations
- Verify the `path` field matches between storage and database

## Next Steps

1. Upload test files through the UI
2. Generate AI summaries
3. Check the Supabase dashboard to verify data is being stored
4. Test the soft delete functionality
5. Deploy to Vercel with the same environment variables
