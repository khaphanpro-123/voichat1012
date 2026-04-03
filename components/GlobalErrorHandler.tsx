"use client"

import { useEffect, useState } from "react"

const ERROR_MSG = "Trang web đang ghi nhận lỗi bất thường đối với phiên hoạt động của bạn, vui lòng tải lại trang web..."

export function GlobalErrorHandler() {
  const [fatalError, setFatalError] = useState(false)

  useEffect(() => {
    // Catch unhandled promise rejections (fetch failures, timeouts, etc.)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || String(event.reason || "")
      // Only show fatal screen for network/server errors, not user errors
      if (
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("AbortError") ||
        msg.includes("bất thường") ||
        msg.includes("502") ||
        msg.includes("503") ||
        msg.includes("504")
      ) {
        console.error("[GlobalErrorHandler] Unhandled rejection:", msg)
        // Don't show fatal screen for background requests — only if page is broken
        // Use a debounce: only show after 3 consecutive errors
      }
    }

    // Catch JS runtime errors
    const handleError = (event: ErrorEvent) => {
      // Ignore ResizeObserver and minor errors
      if (
        event.message?.includes("ResizeObserver") ||
        event.message?.includes("Script error") ||
        event.message?.includes("Non-Error")
      ) return

      console.error("[GlobalErrorHandler] Runtime error:", event.message)
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
    }
  }, [])

  if (fatalError) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 backdrop-blur-sm px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed mb-6">{ERROR_MSG}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    )
  }

  return null
}
