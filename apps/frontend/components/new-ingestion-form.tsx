"use client";

import { FileText, Loader2, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { CustomMetadataSelects } from "@/components/custom-metadata-selects";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIngestionSubmit } from "@/hooks/use-ingestion-submit";
import { usePresets, useSubmitTask } from "@/hooks/use-tasks";
import { useUploadItems } from "@/hooks/use-upload-items";
import { cn, formatBytes } from "@/lib/utils";
import { useTaskStore } from "@/store/task-store";

const TASK_OPTIONS = [
  { label: "Select a Task", value: "unselected" },
  { label: "Parsing", value: "parse" },
  { label: "Chunking", value: "chunk" },
  { label: "Embedding", value: "embed" },
] as const;

function getErrorMessage(
  fileRejections: readonly FileRejection[],
  taskType: string
) {
  if (fileRejections.length === 0) {
    return null;
  }

  if (
    taskType === "chunk" &&
    fileRejections.some((r) =>
      r.errors.some((e) => e.code === "too-many-files")
    )
  ) {
    return "Chunking mode only supports a single file.";
  }

  if (taskType === "chunk") {
    return "Invalid file. Please ensure it is a Markdown (.md) file.";
  }

  if (taskType === "embed") {
    return "Invalid file. Please ensure it is a JSON (.json) file.";
  }

  return "Invalid file. Please ensure it is a PDF under 512MB.";
}

function getAcceptedFiles(
  taskType: string
): Record<string, string[]> | undefined {
  if (taskType === "embed") {
    return { "application/json": [".json"] };
  }
  if (taskType === "chunk") {
    return { "text/markdown": [".md"] };
  }
  if (taskType === "parse") {
    return { "application/pdf": [".pdf"] };
  }
  return;
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
    taskType: "unselected" | "parse" | "chunk" | "embed";
    preset: string;
  }) => void;
}) {
  const { items, setItems, onDrop, removeFile } = useUploadItems();
  const { mutateAsync, isPending } = useSubmitTask();
  const { data: CHUNK_PRESETS, isLoading: isLoadingPresets } = usePresets();
  const { setActiveTask, setNewIngestionModalOpen } = useTaskStore();

  const [taskType, setTaskType] = useState<
    "unselected" | "parse" | "chunk" | "embed"
  >("unselected");
  const [preset, setPreset] = useState("unselected");
  const [format, _setFormat] = useState("markdown");
  const [customMetadata, setCustomMetadata] = useState<Record<string, string>>(
    {}
  );

  const isUploading = items.some((i) => i.status === "uploading");
  const isFormPending = isPending || isUploading;

  useEffect(() => {
    onStateChange?.({
      hasFiles: items.length > 0,
      isUploading,
      isSubmitting: isPending,
      taskType,
      preset,
    });
  }, [items.length, isUploading, isPending, taskType, preset, onStateChange]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      accept: getAcceptedFiles(taskType),
      maxSize: 512 * 1024 * 1024, // TODO: Move synchronous PDF splitting to a TaskIQ background task to prevent API blocking
      maxFiles: taskType === "chunk" ? 1 : undefined,
      disabled:
        isFormPending ||
        (taskType === "chunk" && items.length >= 1) ||
        taskType === "unselected" ||
        (taskType === "chunk" && preset === "unselected"),
      onDrop,
    });

  const errorMessage = getErrorMessage(fileRejections, taskType);

  const filesList = items.map((item) => (
    <li className="relative" key={item.id}>
      <div className="relative rounded-xl border border-border p-4 shadow-none">
        <div className="absolute top-1/2 right-4 -translate-y-1/2">
          <Button
            aria-label="Remove file"
            disabled={isFormPending}
            onClick={() => removeFile(item.id)}
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

  const handleSubmit = useIngestionSubmit({
    items,
    taskType,
    preset,
    format,
    customMetadata,
    onSuccess,
    mutateAsync,
    CHUNK_PRESETS,
    setItems,
    setNewIngestionModalOpen,
    setActiveTask,
  });

  return (
    <form id={id} onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <div className="col-span-full sm:col-span-3">
          <Select
            disabled={isFormPending}
            onValueChange={(v: "unselected" | "parse" | "chunk" | "embed") =>
              setTaskType(v)
            }
            value={taskType}
          >
            <SelectTrigger className="w-full" id="task-type">
              <SelectValue placeholder="Select task type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tasks</SelectLabel>
                {TASK_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {taskType === "chunk" && (
          <div className="col-span-full sm:col-span-3">
            <Select
              disabled={isFormPending}
              onValueChange={(v: string) => {
                setPreset(v);
                if (v === "unselected" || !CHUNK_PRESETS) {
                  setCustomMetadata({});
                } else {
                  setCustomMetadata(
                    CHUNK_PRESETS[v]?.config_overrides.custom_metadata || {}
                  );
                }
              }}
              value={preset}
            >
              <SelectTrigger className="w-full" id="preset">
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Presets</SelectLabel>
                  <SelectItem value="unselected">Select a Preset</SelectItem>
                  {isLoadingPresets ? (
                    <SelectItem disabled value="loading">
                      Loading...
                    </SelectItem>
                  ) : (
                    Object.entries(CHUNK_PRESETS || {}).map(([presetId, p]) => (
                      <SelectItem key={presetId} value={presetId}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}

        <CustomMetadataSelects
          CHUNK_PRESETS={CHUNK_PRESETS}
          isFormPending={isFormPending}
          preset={preset}
          setCustomMetadata={setCustomMetadata}
          taskType={taskType}
        />

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
              taskType === "unselected" ||
                (taskType === "chunk" && preset === "unselected")
                ? "cursor-not-allowed bg-muted/50 opacity-60"
                : "",
              "mt-2 flex justify-center rounded-md border border-dashed px-6 py-20 transition-colors duration-200"
            )}
          >
            <div>
              <FileText
                aria-hidden={true}
                className="mx-auto h-12 w-12 text-muted-foreground/80"
              />
              <div className="mt-4 flex flex-col items-center text-muted-foreground">
                {taskType === "unselected" ||
                (taskType === "chunk" && preset === "unselected") ? (
                  <p className="font-medium text-foreground text-sm">
                    {taskType === "unselected"
                      ? "Please select a Task Type first"
                      : "Please select a Chunking Preset first"}
                  </p>
                ) : (
                  <div className="flex">
                    <p>Drag and drop or</p>
                    <span className="relative cursor-pointer rounded-sm pl-1 font-medium text-primary hover:text-primary/80 hover:underline hover:underline-offset-4">
                      choose file(s)
                      <input {...getInputProps()} className="sr-only" />
                    </span>
                    <p className="text-pretty pl-1">to upload</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-center text-muted-foreground/70 text-xs">
                {(() => {
                  if (taskType === "unselected") {
                    return "Please select a Task Type first";
                  }
                  if (taskType === "chunk" && preset === "unselected") {
                    return "Select a Chunking Preset to continue";
                  }
                  if (taskType === "chunk") {
                    return "Markdown documents up to 100MB";
                  }
                  if (taskType === "embed") {
                    return "JSON documents up to 100MB";
                  }
                  return "PDF documents up to 100MB";
                })()}
              </p>
              {errorMessage && (
                <p className="mt-3 text-center text-destructive text-sm">
                  {errorMessage}
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
