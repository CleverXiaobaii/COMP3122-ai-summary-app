# AI Summary App - Application Documentation

This is a Next.js-based document management and AI summarization application with Supabase backend.

## Quick Start

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm/bun
- Supabase project with database configured
- Environment variables set in `.env.local`

### Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables** (`.env.local`)
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   DEEPSEEK_API_KEY=your-api-key (optional)
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

### Code Quality

```bash
npm run lint
```

## Application Features

### 📁 Document Management
- Upload files (PDF, TXT, etc.)
- Automatic metadata extraction (size, type, timestamps)
- View all documents with full metadata
- Soft-delete functionality

### 🤖 AI Summarization
- Generate summaries using Deepseek API
- Local fallback summarization
- Track summary metadata (model, source, timestamp)
- Persist summaries to database

### 💾 Database Integration
- Supabase Postgres backend
- Automatic document tracking
- Summary storage and retrieval
- Soft-delete with recovery capability

## API Routes

All endpoints are in the `app/api/` directory:

- `POST /api/upload` - Upload file
  - Body: FormData with `file` field
  - Returns: { success, fileName, path, publicUrl, fileSize, documentId }

- `GET /api/files/list` - List documents
  - Returns: { success, count, files: Document[] }

- `DELETE /api/files/delete` - Delete document
  - Body: { path, bucket }
  - Returns: { success, message, path }

- `POST /api/summarize` - Generate summary
  - Body: { fileUrl, fileName, fileType, content }
  - Returns: { success, fileName, summary, model, source }

## Project Structure

```
app/
├── api/                      # API endpoints
│   ├── upload/route.ts       # File upload
│   ├── summarize/route.ts    # Summary generation
│   ├── files/
│   │   ├── list/route.ts     # Document listing
│   │   └── delete/route.ts   # Document deletion
│   └── supabase/connect/

lib/
└── supabase.ts               # Supabase client initialization

supabase/
└── sql/
    └── create_documents_table.sql
```

## Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for creating user storage buckets)

### Optional
- `DEEPSEEK_API_KEY` - Deepseek API for AI summaries

## Deployment

### Deploy to Vercel

1. Connect GitHub repository to Vercel
2. Add environment variables in project settings
3. Vercel auto-deploys on push

### Important: Setting up Supabase Service Role Key

The application needs the Supabase Service Role Key to create storage buckets for new users. Here's how to set it up:

1. **Get your Service Role Key**:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Find the "service_role" key (NOT the anon/public key)
   - Copy the key

2. **Add to Vercel Environment Variables**:
   - Go to your Vercel project settings
   - Navigate to Environment Variables
   - Add a new variable:
     - Name: `SUPABASE_SERVICE_ROLE_KEY`
     - Value: Your service role key
   - Redeploy the application

3. **Alternative: Manual Bucket Creation**:
   If you don't want to use the service key, you can manually create storage buckets:
   - In Supabase, go to Storage
   - Create a bucket named `default` (if not exists)
   - For each registered user, create a bucket named `user-{user-id}`
   - Make sure buckets have proper RLS policies

### Troubleshooting "Bucket not found" Error

If users get "Bucket not found" when uploading files:

1. Check that `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
2. Verify the key has proper permissions
3. Check Supabase Storage RLS policies allow bucket creation
4. Test by visiting `/api/supabase/connect` to see connection status

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- See [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) for database setup
- See [TESTING_GUIDE.md](../TESTING_GUIDE.md) for testing instructions
