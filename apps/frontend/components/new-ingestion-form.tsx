"use client";

import { FileText, Loader2, Trash } from "lucide-react";
import React from "react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { useSubmitTask } from "@/hooks/use-tasks";
import { api, type UploadResponse } from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";
import { useTaskStore } from "@/store/task-store";

interface UploadItem {
  error?: string;
  file: globalThis.File;
  id: string;
  status: "uploading" | "success" | "error";
  uploadResponse?: UploadResponse;
}

export function NewIngestionForm({
  id,
  onSuccess,
  onStateChange,
}: {
  id?: string;
  onSuccess: () => void;
  onStateChange?: (state: {
    hasFiles: boolean;
    isUploading: boolean;
    isSubmitting: boolean;
  }) => void;
}) {
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const { setNewIngestionModalOpen, setActiveTaskId } = useTaskStore();
  const { mutateAsync, isPending } = useSubmitTask();
  const format = "markdown"; // TODO: Use state when multiple output formats are supported

  const itemsRef = React.useRef(items);
  itemsRef.current = items;

  React.useEffect(() => {
    return () => {
      // Cleanup unsubmitted files when the modal/form unmounts
      const unsubmitted = itemsRef.current.filter(
        (i) => i.status === "success" && i.uploadResponse
      );
      for (const item of unsubmitted) {
        if (item.uploadResponse) {
          api.deleteUpload(item.uploadResponse.file_id).catch(console.error);
        }
      }
    };
  }, []);

  const isUploading = items.some((i) => i.status === "uploading");
  const isFormPending = isPending || isUploading;

  React.useEffect(() => {
    onStateChange?.({
      hasFiles: items.length > 0,
      isUploading,
      isSubmitting: isPending,
    });
  }, [items.length, isUploading, isPending, onStateChange]);

  const onDrop = React.useCallback((acceptedFiles: globalThis.File[]) => {
    const newItems = acceptedFiles.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      status: "uploading" as const,
    }));
    setItems((prev) => [...prev, ...newItems]);

    const uploadItem = async (item: (typeof newItems)[0]) => {
      try {
        const response = await api.uploadFile(item.file);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "success", uploadResponse: response }
              : i
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "error", error: String(err) } : i
          )
        );
      }
    };

    for (const item of newItems) {
      uploadItem(item).catch(console.error);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      accept: {
        "application/pdf": [".pdf"],
      },
      maxSize: 512 * 1024 * 1024, // TODO: Move synchronous PDF splitting to a TaskIQ background task to prevent API blocking
      disabled: isFormPending,
      onDrop,
    });

  const handleDelete = async (item: UploadItem) => {
    if (item.uploadResponse) {
      try {
        await api.deleteUpload(item.uploadResponse.file_id);
      } catch (error) {
        console.error("Failed to delete orphaned upload", error);
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const filesList = items.map((item) => (
    <li className="relative" key={item.id}>
      <div className="relative rounded-xl border border-border p-4 shadow-none">
        <div className="absolute top-1/2 right-4 -translate-y-1/2">
          <Button
            aria-label="Remove file"
            disabled={isFormPending}
            onClick={() => handleDelete(item)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash aria-hidden={true} className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center space-x-3 p-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText aria-hidden={true} className="h-5 w-5 text-foreground" />
          </span>
          <div>
            <p className="text-pretty font-medium text-foreground">
              {item.file.name}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-pretty text-muted-foreground text-sm">
              <span>{formatBytes(item.file.size)}</span>
              {item.status === "uploading" && (
                <>
                  <span>&bull;</span>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Uploading...</span>
                </>
              )}
              {item.status === "success" &&
                item.uploadResponse?.page_count !== null &&
                item.uploadResponse?.page_count !== undefined && (
                  <>
                    <span>&bull;</span>
                    <span>{item.uploadResponse.page_count} pages</span>
                  </>
                )}
              {item.status === "error" && (
                <>
                  <span>&bull;</span>
                  <span className="text-destructive">Upload failed</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </li>
  ));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const successfulItems = items.filter(
      (i) => i.status === "success" && i.uploadResponse
    );
    if (successfulItems.length === 0) {
      return;
    }

    try {
      const uploadPromises = successfulItems.map((item) => {
        if (!item.uploadResponse) {
          throw new Error("Missing upload response");
        }
        return mutateAsync({
          fileId: item.uploadResponse.file_id,
          filename: item.uploadResponse.filename,
          format,
        });
      });
      const results = await Promise.all(uploadPromises);

      setItems([]);
      onSuccess();
      setNewIngestionModalOpen(false);

      if (results.length > 0) {
        setActiveTaskId(results[0].task_id);
      }
    } catch (error) {
      console.error("Submission failed", error);
      // TODO: Toast
    }
  };

  return (
    <form id={id} onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        {/* TODO: Add back task type and output format selects when they are implemented */}
        <div className="col-span-full">
          <Label className="font-medium" htmlFor="file-upload-2">
            File(s) upload
          </Label>
          <div
            {...getRootProps()}
            className={cn(
              isDragActive
                ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                : "border-border",
              "mt-2 flex justify-center rounded-md border border-dashed px-6 py-20 transition-colors duration-200"
            )}
          >
            <div>
              <FileText
                aria-hidden={true}
                className="mx-auto h-12 w-12 text-muted-foreground/80"
              />
              <div className="mt-4 flex text-muted-foreground">
                <p>Drag and drop or</p>
                <span className="relative cursor-pointer rounded-sm pl-1 font-medium text-primary hover:text-primary/80 hover:underline hover:underline-offset-4">
                  choose file(s)
                  <input {...getInputProps()} className="sr-only" />
                </span>
                <p className="text-pretty pl-1">to upload</p>
              </div>
              <p className="mt-2 text-center text-muted-foreground/70 text-xs">
                PDF documents up to 100MB
              </p>
              {fileRejections.length > 0 && (
                <p className="mt-3 text-center text-destructive text-sm">
                  Invalid file. Please ensure it is a PDF under 100MB.
                </p>
              )}
            </div>
          </div>
          {filesList.length > 0 && (
            <>
              <h4 className="mt-6 text-balance font-medium text-foreground">
                File(s) to upload
              </h4>
              <ul className="mt-4 space-y-4">{filesList}</ul>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
