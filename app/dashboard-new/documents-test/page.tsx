"use client"

export default function DocumentsTestPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Documents Test Page</h1>
      <p className="text-lg">If you can see this, the page works!</p>
      <div className="mt-8 p-4 bg-green-100 rounded">
        <p className="text-green-800">✅ Page rendered successfully</p>
        <p className="text-green-800">✅ No hydration errors</p>
        <p className="text-green-800">✅ No component errors</p>
      </div>
    </div>
  )
}
