"use client";

import { FileText, Trash } from "lucide-react";
import React from "react";
import { useDropzone } from "react-dropzone";

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
import { useSubmitTask } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/store/task-store";

export function NewIngestionForm({
  id,
  onSuccess,
  onStateChange,
}: {
  id?: string;
  onSuccess: () => void;
  onStateChange?: (state: { hasFiles: boolean; isPending: boolean }) => void;
}) {
  const [files, setFiles] = React.useState<globalThis.File[]>([]);
  const { setNewIngestionModalOpen } = useTaskStore();
  const { mutateAsync, isPending } = useSubmitTask();
  const [format, setFormat] = React.useState("markdown");

  React.useEffect(() => {
    onStateChange?.({ hasFiles: files.length > 0, isPending });
  }, [files.length, isPending, onStateChange]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      maxSize: 100 * 1024 * 1024, // TODO: Remove or increase this limit once backend async PDF splitting is implemented
      disabled: isPending,
      onDrop: (acceptedFiles) => setFiles(acceptedFiles),
    });

  const filesList = files.map((file) => (
    <li className="relative" key={file.name}>
      <div className="relative rounded-xl border border-border p-4 shadow-none">
        <div className="absolute top-1/2 right-4 -translate-y-1/2">
          <Button
            aria-label="Remove file"
            disabled={isPending}
            onClick={() =>
              setFiles((prevFiles) =>
                prevFiles.filter((prevFile) => prevFile.name !== file.name)
              )
            }
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
              {file.name}
            </p>
            <p className="mt-0.5 text-pretty text-muted-foreground text-sm">
              {file.size} bytes
            </p>
          </div>
        </div>
      </div>
    </li>
  ));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      return;
    }

    try {
      await mutateAsync({ file: files[0], format });
      setFiles([]);
      onSuccess();
      setNewIngestionModalOpen(false);
    } catch (error) {
      console.error("Upload failed", error);
      // TODO: Toast
    }
  };

  return (
    <form id={id} onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <div className="col-span-full sm:col-span-3">
          <Label className="font-medium" htmlFor="task-type">
            Task
          </Label>
          <Select defaultValue="parsing">
            <SelectTrigger
              className="mt-2 w-full"
              id="task-type"
              name="task-type"
            >
              <SelectValue placeholder="Select task" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tasks</SelectLabel>
                <SelectItem value="parsing">Parsing</SelectItem>
                <SelectItem disabled value="chunking">
                  Chunking (not yet implemented)
                </SelectItem>
                <SelectItem disabled value="embedding">
                  Embedding (not yet implemented)
                </SelectItem>
                <SelectItem disabled value="vector">
                  Vector Storage (not yet implemented)
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-full sm:col-span-3">
          <Label className="font-medium" htmlFor="output-format">
            Output format
          </Label>
          <Select disabled={isPending} onValueChange={setFormat} value={format}>
            <SelectTrigger
              className="mt-2 w-full"
              id="output-format"
              name="output-format"
            >
              <SelectValue placeholder="Select output format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Formats</SelectLabel>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
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
                <label
                  className="relative cursor-pointer rounded-sm pl-1 font-medium text-primary hover:text-primary/80 hover:underline hover:underline-offset-4"
                  htmlFor="file"
                >
                  <span>choose file(s)</span>
                  <input
                    {...getInputProps()}
                    className="sr-only"
                    id="file-upload-2"
                    name="file-upload-2"
                    type="file"
                  />
                </label>
                <p className="text-pretty pl-1">to upload</p>
              </div>
              <p className="mt-2 text-center text-muted-foreground/70 text-xs">
                PDF documents up to 100MB
              </p>
              {fileRejections.length > 0 && (
                <p className="mt-3 text-center text-destructive text-sm">
                  File is too large. Maximum size is 100MB.
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
