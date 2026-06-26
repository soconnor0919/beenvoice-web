"use client";

import * as React from "react";
import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { cn } from "~/lib/utils";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  description?: string;
}

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  status?: "success" | "error" | "pending";
  error?: string;
}

function FilePreview({
  file,
  onRemove,
  status = "pending",
  error,
}: FilePreviewProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return <CheckCircle className="text-primary h-4 w-4" />;
      case "error":
        return <AlertCircle className="text-destructive h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "border-primary/20 bg-primary/10";
      case "error":
        return "border-destructive/20 bg-destructive/10";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between border p-3",
        getStatusColor(),
      )}
    >
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">
            {file.name}
          </p>
          <p className="text-muted-foreground text-xs">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
          {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function FileUpload({
  onFilesSelected,
  accept,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB default
  className,
  disabled = false,
  placeholder = "Drag & drop files here, or click to select",
  description,
}: FileUploadProps) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle accepted files
      const newFiles = [...files, ...acceptedFiles];
      setFiles(newFiles);
      onFilesSelected(newFiles);

      // Handle rejected files
      const newErrors: Record<string, string> = { ...errors };
      rejectedFiles.forEach(({ file, errors: fileErrors }) => {
        const errorMessage = fileErrors
          .map((error) => {
            if (error.code === "file-too-large") {
              return `File is too large. Max size is ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
            }
            if (error.code === "file-invalid-type") {
              return "File type not supported";
            }
            if (error.code === "too-many-files") {
              return `Too many files. Max is ${maxFiles}`;
            }
            return error.message;
          })
          .join(", ");
        newErrors[file.name] = errorMessage;
      });
      setErrors(newErrors);
    },
    [files, onFilesSelected, errors, maxFiles, maxSize],
  );

  const removeFile = (fileToRemove: File) => {
    const newFiles = files.filter((file) => file !== fileToRemove);
    setFiles(newFiles);
    onFilesSelected(newFiles);

    const newErrors = { ...errors };
    delete newErrors[fileToRemove.name];
    setErrors(newErrors);
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      maxFiles,
      maxSize,
      disabled,
    });

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          "hover:border-primary/40 hover:bg-primary/10",
          isDragActive && "border-primary/40 bg-primary/10",
          isDragReject && "border-destructive/40 bg-destructive/10",
          disabled && "cursor-not-allowed opacity-50",
          "bg-background/80 backdrop-blur-sm",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              "p-3 transition-colors",
              isDragActive ? "bg-primary/10" : "bg-muted",
              isDragReject && "bg-destructive/10",
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6 transition-colors",
                isDragActive ? "text-primary" : "text-muted-foreground",
                isDragReject && "text-destructive",
              )}
            />
          </div>
          <div className="space-y-2">
            <p
              className={cn(
                "text-lg font-medium transition-colors",
                isDragActive ? "text-primary" : "text-foreground",
                isDragReject && "text-destructive",
              )}
            >
              {isDragActive
                ? isDragReject
                  ? "File type not supported"
                  : "Drop files here"
                : placeholder}
            </p>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
            <p className="text-xs text-gray-400">
              Max {maxFiles} file{maxFiles !== 1 ? "s" : ""} •{" "}
              {(maxSize / 1024 / 1024).toFixed(1)}MB each
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Selected Files</h4>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <FilePreview
                key={`${file.name}-${index}`}
                file={file}
                onRemove={() => removeFile(file)}
                status={errors[file.name] ? "error" : "success"}
                error={errors[file.name]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="border-destructive/20 bg-destructive/10 border p-3">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="text-destructive h-4 w-4" />
            <span className="text-destructive text-sm font-medium">
              Upload Errors
            </span>
          </div>
          <ul className="text-destructive space-y-1 text-sm">
            {Object.entries(errors).map(([fileName, error]) => (
              <li key={fileName} className="flex items-start gap-2">
                <span className="text-destructive">•</span>
                <span>
                  <strong>{fileName}:</strong> {error}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
