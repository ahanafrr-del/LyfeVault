"use client"

import { useEffect, useRef, useState } from "react"
import jsQR from "jsqr"
import { AlertCircle, Camera, Loader2 } from "lucide-react"
import { ModalShell } from "./shared"

export function QrCameraScanner({
  onDetected,
  onClose,
}: {
  onDetected: (value: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [starting, setStarting] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  async function startCamera() {
    if (starting || cameraReady) return
    setStarting(true)
    setError(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera scanning is unavailable in this browser.")
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error("The camera preview could not be started.")
      video.srcObject = stream
      await video.play()
      setCameraReady(true)
      setStarting(false)
      scanFrame()
    } catch (cameraError) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setStarting(false)
      setError(cameraError instanceof Error ? cameraError.message : "Could not access the camera. Check camera permissions and try again.")
    }
  }

  function scanFrame() {
    const video = videoRef.current
    if (!video || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      frameRef.current = requestAnimationFrame(scanFrame)
      return
    }

    const canvas = canvasRef.current ?? document.createElement("canvas")
    canvasRef.current = canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (context && canvas.width > 0 && canvas.height > 0) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const image = context.getImageData(0, 0, canvas.width, canvas.height)
      const decoded = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })
      if (decoded?.data.trim()) {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setCameraReady(false)
        onDetected(decoded.data.trim())
        return
      }
    }

    frameRef.current = requestAnimationFrame(scanFrame)
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <ModalShell
        title="Scan prescription QR code"
        subtitle="Point your camera at a clear QR code"
        onClose={onClose}
        headerAccent
      >
        <div className="space-y-4 p-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-foreground">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Live camera preview for scanning a prescription QR code"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-[15%] rounded-xl border-2 border-dashed border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" />
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/80 px-6 text-center text-white">
                <Camera className="h-10 w-10 text-white/70" />
                <p className="text-sm">Start the camera and align the QR code inside the frame.</p>
              </div>
            )}
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {cameraReady && (
            <p aria-live="polite" className="text-center text-xs text-muted-foreground">
              Scanning… keep the code steady and well lit.
            </p>
          )}

          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={starting || cameraReady}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {starting ? "Starting camera…" : cameraReady ? "Camera active" : "Start camera"}
          </button>
        </div>
      </ModalShell>
    </div>
  )
}
