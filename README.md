# COMP3122 - AI Summary App

## Project Overview

A modern document management and AI summarization application built with Next.js, Supabase, and various AI APIs. The application allows users to upload documents, generate AI-powered summaries, and manage their documents with persistent storage in a Postgres database.

## Features

### ✨ Core Features

- **📁 Document Management**
  - Upload files to Supabase Storage
  - View all uploaded documents with metadata
  - Soft delete functionality (files marked as deleted, not permanently removed)
  - Real-time file list with refresh capability

- **🤖 AI-Powered Summarization**
  - Generate summaries using Deepseek API
  - Fallback to local extractive summarization
  - Track summary generation metadata (model, timestamp, source)
  - Regenerate summaries on demand

- **💾 Persistent Database Storage**
  - Supabase Postgres database for document metadata
  - Automatic storage of file information:
    - File name, size, type
    - Creation and deletion timestamps
    - Generated summaries and metadata
  - Indexed queries for optimal performance

- **🔄 Data Persistence**
  - All file and summary data persists across sessions
  - Database-backed file listing
  - Real-time status updates

## Technology Stack

- **Frontend**: Next.js 16.1.6, React 19.2.3, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase Postgres
- **Storage**: Supabase Storage Buckets
- **AI APIs**: 
  - Deepseek Chat Completions
  - Google Generative AI (Gemini)
- **Styling**: Tailwind CSS 4
- **Development**: ESLint, TypeScript

## Project Structure

```
my-app/
├── app/
│   ├── api/
│   │   ├── upload/              # File upload endpoint
│   │   ├── files/
│   │   │   ├── list/            # List documents from database
│   │   │   └── delete/          # Soft delete endpoint
│   │   ├── summarize/           # AI summary generation
│   │   ├── supabase/
│   │   │   └── connect/         # Connection test endpoint
│   │   └── health/              # Health check endpoints
│   ├── components/
│   │   └── UploadComponent.tsx  # Main UI component
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── lib/
│   └── supabase.ts              # Supabase client setup
├── supabase/
│   └── sql/
│       └── create_documents_table.sql  # Database schema
├── types/
│   └── pdf-parse.d.ts           # PDF parsing types
└── package.json
```

## Database Schema

### `documents` Table

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| file_name | text | Uploaded filename |
| path | text | Storage path |
| public_url | text | Public access URL |
| file_type | text | MIME type |
| size | bigint | File size in bytes |
| uploaded_at | timestamp | Upload timestamp |
| created_at | timestamp | Record creation time |
| is_deleted | boolean | Soft delete flag |
| deleted_at | timestamp | Deletion timestamp |
| summary | text | Generated summary |
| summary_source | text | Summary source (deepseek/local) |
| summary_model | text | Model version used |
| summary_generated_at | timestamp | Summary generation time |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account with a project
- API keys for AI services (optional):
  - Deepseek API key: https://api.deepseek.com
  - Google Gemini API key: https://aistudio.google.com/app/apikeys

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd COMP3122-ai-summary-app/my-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   
   # AI API Keys (optional - for enhanced summaries)
   DEEPSEEK_API_KEY=your-deepseek-key
   GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
   ```

4. **Set up Supabase Database**
   
   See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed setup instructions.

5. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:3000 in your browser.

## Usage

### Uploading Documents

1. Click "选择要上传的文件" (Choose file to upload)
2. Select a PDF, TXT, or other file
3. Click "📤 上传文件" (Upload file)
4. File metadata is automatically saved to the database

### Generating Summaries

1. Click "✨ 生成 AI 摘要" on a document card
2. Wait for the summary to generate
3. View the summary with model information
4. Summary is automatically saved to the database

### Managing Files

- **Refresh**: Click "刷新列表" to reload files from database
- **Delete**: Click "删除" to soft-delete a file
- **View**: Click "查看" to open the file in a new tab

## API Endpoints

### File Operations

- `POST /api/upload` - Upload file and save metadata
- `GET /api/files/list` - List all documents from database
- `DELETE /api/files/delete` - Soft delete a document

### AI Operations

- `POST /api/summarize` - Generate summary for a document

### Utility

- `GET /api/supabase/connect` - Test Supabase connection
- `GET /api/health` - Health check endpoint

## Development Guide

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing instructions and verification steps.

### Building for Production

```bash
npm run build
npm start
```

### Code Quality

```bash
npm run lint
```

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Create new project on Vercel
3. Connect GitHub repository
4. Set environment variables in Vercel dashboard
5. Deploy

For detailed Vercel deployment instructions, see the [my-app README](./my-app/README.md).

## Environment Variables

### Required for Development/Production

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Optional (for Enhanced Features)

- `DEEPSEEK_API_KEY`: Deepseek API key for advanced summaries
- `GOOGLE_GENERATIVE_AI_API_KEY`: Google Gemini API key

## Features in Development

- [ ] User authentication via Supabase Auth
- [ ] File search and filtering
- [ ] Pagination for large file lists
- [ ] Advanced summary models
- [ ] Export summaries as PDF/DOCX
- [ ] Sharing functionality
- [ ] Summary history and versioning

## Troubleshooting

### Common Issues

**"Supabase 已连接" status not showing**
- Verify environment variables in `.env.local`
- Check Supabase project is active
- Look at browser console for detailed error messages

**Files not appearing in list**
- Ensure `documents` table is created in Supabase
- Verify RLS policies allow SELECT operations
- Check database connection status

**Summaries not generating**
- If using Deepseek: verify API key is valid
- Check that the document path matches in database
- Review server logs for API errors

For more troubleshooting tips, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md#troubleshooting).

## Performance Optimization

- Database indexes on frequently queried fields (path, is_deleted, created_at)
- Soft delete for instant response
- Async summary generation
- Efficient file metadata queries

## License

COMP3122 Course Project

## Contributing

This is a course project. Contributions should be made through proper GitHub pull requests with clear commit messages.

## Support

For issues, questions, or suggestions:
1. Check the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
2. Review [TESTING_GUIDE.md](./TESTING_GUIDE.md)
3. Check the project issues on GitHub
