"use client"

import React from "react"

interface State {
  hasError: boolean
  errorMessage: string
}

export class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, errorMessage: "" }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[GlobalErrorBoundary]", error, info)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen onReload={() => window.location.reload()} />
    }
    return this.props.children
  }
}

function ErrorScreen({ onReload }: { onReload: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Phiên hoạt động bất thường</h2>
        <p className="text-gray-500 text-sm mb-6">
          Trang web đang ghi nhận lỗi bất thường đối với phiên hoạt động của bạn, vui lòng tải lại trang web...
        </p>
        <button
          onClick={onReload}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Tải lại trang
        </button>
      </div>
    </div>
  )
}
