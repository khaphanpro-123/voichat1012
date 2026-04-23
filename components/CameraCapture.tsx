"use client"

import { useRef, useState, useEffect } from "react"
import { enhanceImageQuality, assessImageQuality } from "@/lib/image-enhancement"

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onError: (error: string) => void
  onClose: () => void
}

export default function CameraCapture({ onCapture, onError, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        console.log("[CameraCapture] Requesting camera access...")
        
        // Try environment camera first
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 2600 },
              height: { ideal: 1800 }
            }
          })
          console.log("[CameraCapture] Environment camera granted")
        } catch {
          // Fallback to any camera
          console.log("[CameraCapture] Trying any camera...")
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 2600 },
              height: { ideal: 1800 }
            }
          })
          console.log("[CameraCapture] Any camera granted")
        }

        if (!isMounted || !videoRef.current) {
          console.log("[CameraCapture] Component unmounted or ref not available")
          stream?.getTracks().forEach(track => track.stop())
          return
        }

        videoRef.current.srcObject = stream
        console.log("[CameraCapture] Stream assigned to video")

        // Wait for video to be ready
        const handleLoadedMetadata = () => {
          console.log("[CameraCapture] Video ready")
          if (isMounted) {
            setIsReady(true)
            setIsLoading(false)
          }
        }

        videoRef.current.addEventListener("loadedmetadata", handleLoadedMetadata)

        // Timeout fallback
        const timeoutId = setTimeout(() => {
          if (isMounted && !isReady) {
            console.log("[CameraCapture] Timeout - activating anyway")
            setIsReady(true)
            setIsLoading(false)
          }
        }, 3000)

        return () => {
          clearTimeout(timeoutId)
          if (videoRef.current) {
            videoRef.current.removeEventListener("loadedmetadata", handleLoadedMetadata)
          }
        }
      } catch (err: any) {
        console.error("[CameraCapture] Error:", err)
        if (isMounted) {
          let errorMsg = "Không thể truy cập camera"
          if (err?.name === "NotAllowedError") {
            errorMsg = "Vui lòng cấp quyền truy cập camera"
          } else if (err?.name === "NotFoundError") {
            errorMsg = "Không tìm thấy camera"
          } else if (err?.name === "NotReadableError") {
            errorMsg = "Camera đang được sử dụng"
          } else if (err?.name === "SecurityError") {
            errorMsg = "Cần HTTPS để truy cập camera"
          }
          onError(errorMsg)
          setIsLoading(false)
        }
      }
    }

    startCamera()

    return () => {
      isMounted = false
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [onError])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) {
      onError("Lỗi: Không thể truy cập camera")
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      onError("Camera chưa sẵn sàng")
      return
    }

    try {
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        onError("Lỗi: Không thể vẽ ảnh")
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      canvas.toBlob(async (blob) => {
        if (blob) {
          const originalFile = new File([blob], "camera-photo.jpg", { type: "image/jpeg" })

          // Kiểm tra chất lượng ảnh
          const quality = assessImageQuality(originalFile)
          console.log("[CameraCapture] Image quality:", quality)

          // Nếu chất lượng kém, cải thiện ảnh
          let fileToUse = originalFile
          if (quality.quality === "poor" || quality.quality === "fair") {
            console.log("[CameraCapture] Enhancing image quality...")
            try {
              const enhancedBlob = await enhanceImageQuality(originalFile)
              fileToUse = new File([enhancedBlob], "camera-photo-enhanced.jpg", { type: "image/jpeg" })
              console.log("[CameraCapture] Image enhanced successfully")
            } catch (err) {
              console.warn("[CameraCapture] Enhancement failed, using original")
            }
          }

          onCapture(fileToUse)
        } else {
          onError("Lỗi: Không thể chuyển đổi ảnh")
        }
      }, "image/jpeg", 0.95)
    } catch (err: any) {
      onError(`Lỗi chụp ảnh: ${err?.message}`)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-white text-sm">Đang khởi động camera...</p>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      <button
        onClick={handleCapture}
        disabled={!isReady || isLoading}
        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 text-sm font-medium transition-colors"
      >
        {isLoading ? "Đang khởi động..." : "Chụp ảnh"}
      </button>

      <button
        onClick={onClose}
        className="w-full py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium transition-colors"
      >
        Hủy
      </button>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
