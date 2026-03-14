import { BookOpen } from 'lucide-react'
export default function Journal() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Journal</h1>
      <p className="text-gray-500 text-sm">ICPAK/IFRS Double-entry journal entries — KES</p>
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Journal entries will appear here</p>
        <p className="text-sm">Connect Supabase to enable live journaling</p>
      </div>
    </div>
  )
}
