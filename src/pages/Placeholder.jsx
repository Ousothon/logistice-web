import { Construction } from 'lucide-react'

export default function Placeholder({ title }) {
  return (
    <div className="h-[70vh] flex flex-col items-center justify-center text-center bg-white border border-dashed border-mist-200 rounded-md">
      <div className="w-12 h-12 rounded-full bg-ink-900/5 text-ink-700 flex items-center justify-center mb-3">
        <Construction size={22} />
      </div>
      <h2 className="font-display font-bold text-ink-900">{title}</h2>
      <p className="text-sm text-ink-600/55 mt-1 max-w-xs">
        Module នេះកំពុងត្រូវបានអភិវឌ្ឍ។ Layout និង Dashboard ត្រូវបានបញ្ចប់ជាមុនសិន។
      </p>
    </div>
  )
}
