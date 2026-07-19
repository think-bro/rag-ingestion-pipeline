import type { UploadItem } from "@/hooks/use-upload-items";
import type { Preset, PresetsResponse } from "@/lib/api";

export function useIngestionSubmit({
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
}: {
  items: UploadItem[];
  taskType: "unselected" | "parse" | "chunk" | "embed";
  preset: string;
  embedModel?: string;
  format: string;
  customMetadata: Record<string, string>;
  onSuccess: () => void;
  mutateAsync: (args: {
    fileId: string;
    filename: string;
    action?: "parse" | "chunk" | "embed";
    formatOrPreset?: string;
    embedModel?: string;
    customMetadata?: Record<string, string>;
    presetData?: Preset;
  }) => Promise<{ task_id: string }>;
  CHUNK_PRESETS?: PresetsResponse;
  setItems: (
    items: UploadItem[] | ((prev: UploadItem[]) => UploadItem[])
  ) => void;
  setNewIngestionModalOpen: (open: boolean) => void;
  setActiveTask: (
    id: string,
    type: "parsing" | "chunking" | "embedding"
  ) => void;
}) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const successfulItems = items.filter(
      (i) => i.status === "success" && i.uploadResponse
    );
    if (
      successfulItems.length === 0 ||
      taskType === "unselected" ||
      (taskType === "chunk" && preset === "unselected") ||
      (taskType === "embed" && embedModel === "unselected")
    ) {
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
          action: taskType,
          formatOrPreset: taskType === "chunk" ? preset : format,
          embedModel: taskType === "embed" ? embedModel : undefined,
          customMetadata: taskType === "chunk" ? customMetadata : undefined,
          presetData:
            taskType === "chunk" && CHUNK_PRESETS
              ? CHUNK_PRESETS[preset]
              : undefined,
        });
      });
      const results = await Promise.all(uploadPromises);

      setItems([]);
      onSuccess();
      setNewIngestionModalOpen(false);

      if (results.length > 0) {
        let activeType: "parsing" | "chunking" | "embedding" = "chunking";
        if (taskType === "embed") {
          activeType = "embedding";
        } else if (taskType === "parse") {
          activeType = "parsing";
        }
        setActiveTask(results[0].task_id, activeType);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Submission failed", (error as Error).message);
      } else {
        console.error("Submission failed", error);
      }
      // TODO: Toast
    }
  };
  return handleSubmit;
}
