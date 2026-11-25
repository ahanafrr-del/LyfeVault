"use client"

import { useState } from "react"
import { Download, Minus, Plus } from "lucide-react"
import { ModalShell } from "./shared"

export function FileViewer({
  fileName,
  fileUrl,
  onClose,
}: {
  fileName: string
  fileUrl: string
  onClose: () => void
}) {
  const [zoom, setZoom] = useState(1)
  const isPdf = fileName.toLowerCase().endsWith(".pdf") || fileUrl.toLowerCase().includes("application/pdf")

  return (
    <ModalShell title={fileName || "Health record"} subtitle="Private, time-limited file access" onClose={onClose}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        {!isPdf ? (
          <div className="flex items-center gap-2" aria-label="Image zoom controls">
            <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} aria-label="Zoom out" className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><Minus className="size-4" /></button>
            <span className="min-w-12 text-center text-xs font-semibold text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} aria-label="Zoom in" className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><Plus className="size-4" /></button>
          </div>
        ) : <span className="text-xs text-muted-foreground">PDF preview</span>}
        <a href={fileUrl} download={fileName} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          <Download className="size-4" /> Download
        </a>
      </div>
      <div className="flex max-h-[65dvh] min-h-72 items-center justify-center overflow-auto bg-muted p-3">
        {isPdf ? (
          <iframe title={`PDF preview: ${fileName}`} src={fileUrl} className="h-[62dvh] min-h-80 w-full rounded-lg bg-white" />
        ) : (
          <img src={fileUrl} alt={fileName || "Health document"} style={{ transform: `scale(${zoom})` }} className="max-h-[60dvh] max-w-full origin-center object-contain transition-transform" />
        )}
      </div>
    </ModalShell>
  )
}
