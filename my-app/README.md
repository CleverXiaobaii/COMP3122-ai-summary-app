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

### Optional
- `DEEPSEEK_API_KEY` - Deepseek API for AI summaries

## Deployment

### Deploy to Vercel

1. Connect GitHub repository to Vercel
2. Add environment variables in project settings
3. Vercel auto-deploys on push

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- See [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) for database setup
- See [TESTING_GUIDE.md](../TESTING_GUIDE.md) for testing instructions
