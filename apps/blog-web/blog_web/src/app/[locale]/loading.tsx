export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-slate-700" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
        </div>
        <p className="text-sm text-gray-400 dark:text-slate-500">Loading...</p>
      </div>
    </div>
  )
}
