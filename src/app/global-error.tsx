'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-8">
          <h2 className="text-2xl font-bold">系统错误</h2>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <button
            onClick={reset}
            className="mt-4 rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
          >
            重试
          </button>
        </div>
      </body>
    </html>
  )
}
