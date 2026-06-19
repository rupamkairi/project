import { useState, useEffect, useCallback } from "react"
import { createRoute } from "@tanstack/react-router"
import { Route as dashboardLayoutRoute } from "./dashboard.layout"
import { FileUpload } from "@projectx/plugin-storage-web/components/file-upload"
import { platformApi } from "../lib/api/platform"
import { FileIcon, Trash2, Download, Loader2 } from "lucide-react"
import { Button, PageHeader } from "@projectx/ui"

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/files",
  component: FilesPage,
})

function FilesPage() {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    const result = await platformApi.listFiles({ limit: 50 })
    if (result.data) {
      setFiles(result.data.files)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleUploadComplete = (file: any) => {
    setFiles((prev) => [file, ...prev])
  }

  const handleDelete = async (fileId: string) => {
    await platformApi.deleteFile(fileId)
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const handleDownload = async (fileId: string) => {
    const result = await platformApi.getDownloadUrl(fileId)
    if (result.data?.url) {
      window.open(result.data.url, "_blank")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Files" description="Upload and manage your files" />

      <FileUpload
        api={platformApi as any}
        onUploadComplete={handleUploadComplete}
        accept={{
          "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
          "application/pdf": [".pdf"],
        }}
        maxSize={10 * 1024 * 1024}
      />

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <h2 className="font-medium text-sm">Uploaded Files</h2>
          <p className="text-xs text-muted-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileIcon className="w-10 h-10 text-muted-foreground mb-3" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No files uploaded yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use the upload area above to add files
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={1.75} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} · {formatDate(file.createdAt || file.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(file.id)}
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(file.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
