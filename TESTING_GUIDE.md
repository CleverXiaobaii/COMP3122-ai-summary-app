# App Testing & Feature Verification Guide

## Test Environment
- **Development Server**: http://localhost:3000
- **Framework**: Next.js 16.1.6
- **Backend**: Supabase (Postgres + Storage)
- **Database**: Supabase Postgres

## Features Implemented

### 1. Document Upload with Metadata Storage
✅ **Feature**: Upload files to Supabase Storage
✅ **Database Integration**: Automatically stores document metadata in `documents` table
✅ **Fields Captured**:
- file_name: Original filename
- path: Storage bucket path
- public_url: Public access URL
- file_type: MIME type
- size: File size in bytes
- created_at: Upload timestamp
- is_deleted: Deletion status (default: false)

**Test Steps**:
1. Open http://localhost:3000
2. Wait for "✅ Supabase 已连接" status to appear
3. Click "选择要上传的文件" and select a test file (PDF, TXT, etc.)
4. Click "📤 上传文件"
5. Verify success message appears
6. Check the file appears in "📋 已上传的文件" list below

### 2. Document Metadata Display
✅ **Feature**: Shows complete document information in UI
✅ **Displayed Fields**:
- File name
- File type
- File size (in KB)
- Creation timestamp (formatted)
- Deletion status (if deleted)

**Test Steps**:
1. After uploading a file (see test 1)
2. Observe the file card displays:
   - File type (e.g., "application/pdf")
   - File size (e.g., "250.50 KB")
   - Upload time in format: "2026/2/16 14:30:45"

### 3. AI-Powered Summary Generation
✅ **Feature**: Generate AI summaries using Deepseek API or local fallback
✅ **Summary Storage**: Automatically saved to database with metadata
✅ **Fields Stored**:
- summary: Generated summary text
- summary_source: "deepseek" or "local"
- summary_model: Model version (e.g., "deepseek-chat")
- summary_generated_at: Generation timestamp

**Test Steps**:
1. Open a file card in the list
2. Click "✨ 生成 AI 摘要" button
3. Wait for "⏳ 生成摘要中..." status
4. Once complete, view the summary in the purple box below
5. Observe the model name and generation timestamp in the header

### 4. Soft Delete Functionality
✅ **Feature**: Mark files as deleted without permanent removal
✅ **Database Behavior**:
- Sets is_deleted = true
- Records deleted_at timestamp
- Original data remains in database

**Test Steps**:
1. Click "删除" button on a file card
2. Confirm deletion in popup dialog
3. File should be marked with "[已删除]" indicator
4. UI shows file is deleted but data remains in database
5. Verify in Supabase console: query documents table, can still see deleted records

### 5. Data Persistence
✅ **Feature**: Data persists across page refreshes and server restarts
✅ **Verification Method**: File list loads from database

**Test Steps**:
1. Upload and summarize files
2. Refresh the page (F5)
3. Click "刷新列表" button
4. Verify all files and summaries appear again
5. Data is retrieved from Supabase Postgres database

## Testing Checklist

### Basic Functionality
- [ ] Server starts without errors: `npm run dev`
- [ ] Connection status shows "✅ Supabase 已连接"
- [ ] "重新测试" button triggers connection test

### File Upload
- [ ] Can upload PDF files
- [ ] Can upload TXT files
- [ ] Can upload other file types
- [ ] File size is correctly captured
- [ ] File type (MIME type) is correctly detected
- [ ] Success message appears after upload
- [ ] Newly uploaded file immediately appears in list

### Database Integration
- [ ] Files are stored in `documents` table
- [ ] All metadata fields are populated
- [ ] created_at timestamp is accurate
- [ ] File sizes are correctly stored

### Summary Generation
- [ ] Summary generation button is clickable
- [ ] Shows loading state during generation
- [ ] Summary text appears after generation
- [ ] Summary includes model name and timestamp
- [ ] Summary is persisted when page is refreshed

### UI/UX Features
- [ ] File list shows file information in grid layout
- [ ] File size displays in KB
- [ ] Timestamps format correctly (Chinese locale)
- [ ] Deleted files show "[已删除]" indicator
- [ ] Deleted files become read-only (no view/delete buttons)
- [ ] Summary box displays after generation

### Error Handling
- [ ] Error message appears if upload fails
- [ ] Error recovers gracefully without crash
- [ ] Appropriate feedback for missing files
- [ ] Network errors are handled with user messages

## Database Verification Steps

### In Supabase Console

1. **Navigate to SQL Editor**
   - Click "SQL Editor" → "New Query"

2. **View All Documents**
   ```sql
   SELECT * FROM documents ORDER BY created_at DESC;
   ```
   - Should show all uploaded files
   - Check that metadata fields are populated

3. **View Only Active Documents**
   ```sql
   SELECT * FROM documents WHERE is_deleted = false ORDER BY created_at DESC;
   ```

4. **View Deleted Documents**
   ```sql
   SELECT * FROM documents WHERE is_deleted = true;
   ```

5. **Check Summary Statistics**
   ```sql
   SELECT 
     COUNT(*) as total_files,
     COUNT(CASE WHEN summary IS NOT NULL THEN 1 END) as files_with_summary,
     COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted_files
   FROM documents;
   ```

6. **View Recent Summaries**
   ```sql
   SELECT file_name, summary, summary_model, summary_generated_at 
   FROM documents 
   WHERE summary IS NOT NULL 
   ORDER BY summary_generated_at DESC 
   LIMIT 10;
   ```

## Performance Notes

- Initial page load queries both storage and database
- File list loads documents first, then matches with storage
- Soft delete is immediate (no full re-fetch required)
- Summary generation creates database update in background
- Indexes are created on frequently queried fields: (path, is_deleted, created_at)

## Known Limitations

- Soft delete still removes file from storage (can be changed if needed)
- Local summary fallback has basic extractive algorithm
- Deepseek API key required for advanced summaries
- No user authentication layer (all operations public)
- No pagination yet (all files loaded at once)

## Next Steps for Production

1. Implement user authentication
2. Add RLS policies for multi-user security
3. Implement pagination for large file lists
4. Add search/filter functionality
5. Enable hard delete with confirmation requirement
6. Add file type restrictions/validation
7. Implement progress tracking for uploads
8. Add retry logic for failed summaries
