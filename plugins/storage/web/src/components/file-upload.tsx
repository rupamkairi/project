import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  Upload,
  File,
  X,
  Image,
  Loader2,
  FileText,
  Film,
  Music,
  Archive,
} from "lucide-react";
import { Button, Spinner, Card, CardContent, cn } from "@projectx/ui";

interface UploadedFile {
  id: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
}

interface FileUploadProps {
  api: StorageApi;
  accept?: Record<string, string[]>;
  maxSize?: number;
  folder?: string;
  onUploadComplete?: (file: UploadedFile) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return Image;
  if (contentType.startsWith("video/")) return Film;
  if (contentType.startsWith("audio/")) return Music;
  if (
    contentType.includes("zip") ||
    contentType.includes("tar") ||
    contentType.includes("rar") ||
    contentType.includes("7z")
  )
    return Archive;
  return FileText;
}

function FileItem({
  file,
  onDelete,
  onPreview,
}: {
  file: UploadedFile;
  onDelete: (id: string) => void;
  onPreview?: (file: UploadedFile) => void;
}) {
  const isImage = file.contentType.startsWith("image/");
  const FileIcon = getFileIcon(file.contentType);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
        {isImage && file.url ? (
          <img
            src={file.url}
            alt={file.filename}
            className="h-full w-full rounded-md object-cover"
          />
        ) : (
          <FileIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)} • {file.contentType}
        </p>
      </div>
      <div className="flex gap-1">
        {isImage && onPreview && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPreview(file)}
          >
            <Image className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(file.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function UploadProgress({
  progress,
  filename,
}: {
  progress: number;
  filename: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="truncate text-sm font-medium">{filename}</span>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function FileUpload({
  api,
  accept = { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
  maxSize = 10 * 1024 * 1024,
  folder,
  onUploadComplete,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setCurrentFile(file.name);
    setUploadProgress(0);

    try {
      const { uploadUrl, fileId, key } = await api.getUploadUrl(
        file.name,
        file.type,
        folder,
      );

      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      const { file: completedFile } = await api.completeUpload(fileId);

      const uploadedFile: UploadedFile = {
        id: fileId,
        key,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      };

      setFiles((prev) => [...prev, uploadedFile]);
      onUploadComplete?.(uploadedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentFile(null);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        await uploadFile(file);
      }
    },
    [api, folder, onUploadComplete],
  );

  const handleFileRejection = useCallback(
    (rejections: FileRejection[]) => {
      const errors = rejections.map((r) => {
        if (r.file.size > maxSize) {
          return `${r.file.name} exceeds maximum size of ${formatFileSize(maxSize)}`;
        }
        return `${r.file.name} has unsupported file type`;
      });
      setError(errors.join(", "));
    },
    [maxSize],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      maxSize,
      onFileRejection: handleFileRejection,
      disabled: uploading,
    });

  const handleDelete = useCallback(
    async (fileId: string) => {
      try {
        await api.deleteFile(fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [api],
  );

  const handlePreview = useCallback((file: UploadedFile) => {
    window.open(file.url || `/${file.key}`, "_blank");
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={cn(
              "relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
              isDragActive && !isDragReject
                ? "border-foreground/30 bg-accent/50"
                : isDragReject
                  ? "border-destructive bg-destructive/5"
                  : "border-border hover:border-muted-foreground/40 hover:bg-accent/50",
              uploading && "pointer-events-none opacity-50",
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3 text-center">
              {isDragActive && !isDragReject ? (
                <>
                  <div className="rounded-full bg-muted p-3">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Drop your files here</p>
                    <p className="text-xs text-muted-foreground">
                      Release to upload
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-muted p-3">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Drag & drop files here, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Accepts {Object.values(accept).flat().join(", ")} up to{" "}
                      {formatFileSize(maxSize)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {uploading && currentFile && (
        <UploadProgress progress={uploadProgress} filename={currentFile} />
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Uploaded Files</h3>
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onDelete={handleDelete}
              onPreview={handlePreview}
            />
          ))}
        </div>
      )}
    </div>
  );
}
