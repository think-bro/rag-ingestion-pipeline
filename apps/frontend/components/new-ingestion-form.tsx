"use client";

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { CustomMetadataSelects } from "@/components/custom-metadata-selects";
import { FileListItem } from "@/components/file-list-item";
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
import { useEmbedModels } from "@/hooks/use-embedding-tasks";
import { useIngestionSubmit } from "@/hooks/use-ingestion-submit";
import { usePresets, useSubmitTask } from "@/hooks/use-tasks";
import { useUploadItems } from "@/hooks/use-upload-items";
import { cn } from "@/lib/utils";
import { useFormStore } from "@/store/form-store";
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

function getMissingSelectionMessage(
  taskType: string,
  preset: string,
  embedModel: string
): string | null {
  if (taskType === "unselected") {
    return "Please select a Task Type first";
  }
  if (taskType === "chunk" && preset === "unselected") {
    return "Please select a Chunking Preset first";
  }
  if (taskType === "embed" && embedModel === "unselected") {
    return "Please select an Embedding Model first";
  }
  return null;
}

function getDropzoneSubtitle(taskType: string): string {
  if (taskType === "chunk") {
    return "Markdown documents up to 100MB";
  }
  if (taskType === "embed") {
    return "JSON documents up to 100MB";
  }
  return "PDF documents up to 100MB";
}

function isDropzoneDisabled(
  taskType: string,
  preset: string,
  embedModel: string,
  itemCount: number,
  isFormPending: boolean
): boolean {
  if (isFormPending) {
    return true;
  }
  if (taskType === "unselected") {
    return true;
  }
  if (taskType === "chunk" && itemCount >= 1) {
    return true;
  }
  if (taskType === "chunk" && preset === "unselected") {
    return true;
  }
  if (taskType === "embed" && embedModel === "unselected") {
    return true;
  }
  return false;
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

  const taskType = useFormStore((s) => s.taskType);
  const setTaskType = useFormStore((s) => s.setTaskType);
  const preset = useFormStore((s) => s.preset);
  const setPreset = useFormStore((s) => s.setPreset);
  const embedModel = useFormStore((s) => s.embedModel);
  const setEmbedModel = useFormStore((s) => s.setEmbedModel);
  const format = useFormStore((s) => s.format);
  const [customMetadata, setCustomMetadata] = useState<Record<string, string>>(
    {}
  );

  const isUploading = items.some((i) => i.status === "uploading");
  const isFormPending = isPending || isUploading;
  const { data: embedModels, isLoading: isLoadingEmbedModels } =
    useEmbedModels();

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
      disabled: isDropzoneDisabled(
        taskType,
        preset,
        embedModel,
        items.length,
        isFormPending
      ),
      onDrop,
    });

  const errorMessage = getErrorMessage(fileRejections, taskType);

  const filesList = items.map((item) => (
    <FileListItem
      isFormPending={isFormPending}
      item={item}
      key={item.id}
      removeFile={removeFile}
    />
  ));

  const handleSubmit = useIngestionSubmit({
    items,
    taskType,
    preset,
    embedModel,
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

        {taskType === "embed" && (
          <div className="col-span-full sm:col-span-3">
            <Select
              disabled={isFormPending}
              onValueChange={(v: string) => setEmbedModel(v)}
              value={embedModel}
            >
              <SelectTrigger className="w-full" id="embed-model">
                <SelectValue placeholder="Select embedding model" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Models</SelectLabel>
                  <SelectItem value="unselected">Select a Model</SelectItem>
                  {isLoadingEmbedModels ? (
                    <SelectItem disabled value="loading">
                      Loading...
                    </SelectItem>
                  ) : (
                    (embedModels || []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
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
                (taskType === "chunk" && preset === "unselected") ||
                (taskType === "embed" && embedModel === "unselected")
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
                {getMissingSelectionMessage(taskType, preset, embedModel) ? (
                  <p className="font-medium text-foreground text-sm">
                    {getMissingSelectionMessage(taskType, preset, embedModel)}
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
                {getMissingSelectionMessage(taskType, preset, embedModel) ??
                  getDropzoneSubtitle(taskType)}
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
