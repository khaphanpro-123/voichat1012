const ERROR_MESSAGE = "Trang web đang ghi nhận lỗi bất thường đối với phiên hoạt động của bạn, vui lòng tải lại trang web..."

// In-flight request deduplication: same URL+method → reuse same promise
const inFlight = new Map<string, Promise<Response>>()

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30000, ...fetchOptions } = options
  const key = `${fetchOptions.method || "GET"}:${url}`

  // Deduplicate concurrent identical GET requests
  if (!fetchOptions.method || fetchOptions.method === "GET") {
    const existing = inFlight.get(key)
    if (existing) return existing
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const promise = fetch(url, { ...fetchOptions, signal: controller.signal })
    .then((res) => {
      clearTimeout(timer)
      return res
    })
    .catch((err) => {
      clearTimeout(timer)
      if (err.name === "AbortError") {
        throw new Error(ERROR_MESSAGE)
      }
      throw new Error(ERROR_MESSAGE)
    })
    .finally(() => {
      inFlight.delete(key)
    })

  if (!fetchOptions.method || fetchOptions.method === "GET") {
    inFlight.set(key, promise)
  }

  return promise
}

// Wrapper that shows user-friendly error
export async function safeFetch<T>(
  url: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetchWithTimeout(url, options)
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      // Server errors → show friendly message
      if (res.status >= 500) {
        return { data: null, error: ERROR_MESSAGE }
      }
      return { data: null, error: text || `Lỗi ${res.status}` }
    }
    const data = await res.json()
    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || ERROR_MESSAGE }
  }
}
