import type { UploadItem } from "@/hooks/use-upload-items";
import type { IndexConfig, Preset, PresetsResponse } from "@/lib/api";

function isValidSubmission(
  taskType: string,
  successfulItems: UploadItem[],
  preset: string,
  denseModel?: string,
  sparseModel?: string,
  sparseLanguage?: string,
  vectorDb?: string
) {
  if (successfulItems.length === 0 || taskType === "unselected") {
    return false;
  }
  if (taskType === "chunk" && preset === "unselected") {
    return false;
  }
  if (
    taskType === "embed" &&
    (denseModel === "unselected" ||
      sparseModel === "unselected" ||
      sparseLanguage === "unselected")
  ) {
    return false;
  }
  if (taskType === "index" && vectorDb === "unselected") {
    return false;
  }
  return true;
}

function buildTaskPayload(
  item: UploadItem,
  taskType: "unselected" | "parse" | "chunk" | "embed" | "index",
  format: string,
  preset: string,
  customMetadata: Record<string, string>,
  denseModel?: string,
  sparseModel?: string,
  sparseLanguage?: string,
  vectorDb?: string,
  vectorDbUrl?: string,
  vectorDbCollection?: string,
  CHUNK_PRESETS?: PresetsResponse
) {
  if (!item.uploadResponse) {
    throw new Error("Missing upload response");
  }

  const basePayload = {
    fileId: item.uploadResponse.file_id,
    filename: item.uploadResponse.filename,
    action: taskType as "parse" | "chunk" | "embed" | "index",
  };

  if (taskType === "chunk") {
    return {
      ...basePayload,
      formatOrPreset: preset,
      customMetadata,
      presetData: CHUNK_PRESETS ? CHUNK_PRESETS[preset] : undefined,
    };
  }

  if (taskType === "embed") {
    return {
      ...basePayload,
      denseModel,
      sparseModel,
      sparseLanguage,
    };
  }

  if (taskType === "index") {
    return {
      ...basePayload,
      indexConfig: {
        db_name: vectorDb || "",
        url: vectorDbUrl || "",
        collection_name: vectorDbCollection || "",
      },
    };
  }

  return {
    ...basePayload,
    formatOrPreset: format,
  };
}

const TASK_TYPE_MAP = {
  parse: "parsing",
  chunk: "chunking",
  embed: "embedding",
  index: "indexing",
} as const;

export function useIngestionSubmit({
  items,
  taskType,
  preset,
  denseModel,
  sparseModel,
  sparseLanguage,
  vectorDb,
  vectorDbUrl,
  vectorDbCollection,
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
  taskType: "unselected" | "parse" | "chunk" | "embed" | "index";
  preset: string;
  denseModel?: string;
  sparseModel?: string;
  sparseLanguage?: string;
  vectorDb?: string;
  vectorDbUrl?: string;
  vectorDbCollection?: string;
  format: string;
  customMetadata: Record<string, string>;
  onSuccess: () => void;
  mutateAsync: (args: {
    fileId: string;
    filename: string;
    action?: "parse" | "chunk" | "embed" | "index";
    formatOrPreset?: string;
    denseModel?: string;
    sparseModel?: string;
    sparseLanguage?: string;
    customMetadata?: Record<string, string>;
    presetData?: Preset;
    indexConfig?: IndexConfig;
  }) => Promise<{ task_id: string }>;
  CHUNK_PRESETS?: PresetsResponse;
  setItems: (
    items: UploadItem[] | ((prev: UploadItem[]) => UploadItem[])
  ) => void;
  setNewIngestionModalOpen: (open: boolean) => void;
  setActiveTask: (
    id: string,
    type: "parsing" | "chunking" | "embedding" | "indexing"
  ) => void;
}) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const successfulItems = items.filter(
      (i) => i.status === "success" && i.uploadResponse
    );

    if (
      !isValidSubmission(
        taskType,
        successfulItems,
        preset,
        denseModel,
        sparseModel,
        sparseLanguage,
        vectorDb
      )
    ) {
      return;
    }

    try {
      const uploadPromises = successfulItems.map((item) => {
        const payload = buildTaskPayload(
          item,
          taskType,
          format,
          preset,
          customMetadata,
          denseModel,
          sparseModel,
          sparseLanguage,
          vectorDb,
          vectorDbUrl,
          vectorDbCollection,
          CHUNK_PRESETS
        );
        return mutateAsync(payload);
      });
      const results = await Promise.all(uploadPromises);

      setItems([]);
      onSuccess();
      setNewIngestionModalOpen(false);

      if (results.length > 0 && taskType !== "unselected") {
        setActiveTask(results[0].task_id, TASK_TYPE_MAP[taskType]);
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
