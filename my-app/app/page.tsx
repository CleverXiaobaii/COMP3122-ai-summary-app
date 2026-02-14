import UploadComponent from './components/UploadComponent'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">AI Summary App</h1>
        <p className="text-gray-600 mb-8">Powered by Supabase</p>
        <UploadComponent />
      </div>
    </div>
  );
}