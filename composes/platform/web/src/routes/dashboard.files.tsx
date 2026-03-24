import { useState, useEffect, useCallback } from "react";
import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { FileUpload } from "@projectx/plugin-storage-web/components/file-upload";
import { platformApi } from "../lib/api/platform";
import { FileIcon, Trash2, Download, Loader2 } from "lucide-react";
import { Button } from "@projectx/ui";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/files",
  component: FilesPage,
});

function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const result = await platformApi.listFiles({ limit: 50 });
    if (result.data) {
      setFiles(result.data.files);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUploadComplete = (file: any) => {
    setFiles((prev) => [file, ...prev]);
  };

  const handleDelete = async (fileId: string) => {
    await platformApi.deleteFile(fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    const result = await platformApi.getDownloadUrl(fileId);
    if (result.data?.url) {
      window.open(result.data.url, "_blank");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Files</h1>
        <p className="text-muted-foreground mt-1">
          Upload and manage your files
        </p>
      </div>

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
          <h2 className="font-medium">Uploaded Files</h2>
          <p className="text-sm text-muted-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileIcon className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No files uploaded yet</p>
            <p className="text-sm text-muted-foreground">
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
                  <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} •{" "}
                      {formatDate(file.createdAt || file.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(file.id, file.name)}
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(file.id)}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
