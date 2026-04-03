"use client"

import { useState, useCallback } from "react"

const ERROR_MSG = "Trang web đang ghi nhận lỗi bất thường đối với phiên hoạt động của bạn, vui lòng tải lại trang web..."

export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    // Map technical errors to user-friendly message
    if (
      msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("500") ||
      msg.includes("502") ||
      msg.includes("503") ||
      msg.includes("504") ||
      msg.includes("timeout") ||
      msg.includes("AbortError") ||
      msg.includes("bất thường")
    ) {
      setError(ERROR_MSG)
    } else {
      setError(msg)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { error, handleError, clearError }
}

// Inline error banner component
export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg flex items-start gap-3">
        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-700">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs font-medium text-red-600 underline hover:text-red-800"
          >
            Tải lại trang
          </button>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
