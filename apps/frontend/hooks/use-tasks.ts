import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type ChunkItem,
  type ChunkTaskResponse,
  type CombinedTask,
  type ParseTaskResponse,
  type PartResponse,
  type Preset,
  type PresetsResponse,
} from "@/lib/api";

export const TASKS_QUERY_KEY = ["documents-tasks"];

/**
 * Hook to fetch and automatically poll the combined task list (both Parsing and Chunking).
 */
export function useTasks() {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: async (): Promise<CombinedTask[]> => {
      // Fetch both parsing and chunking tasks in parallel
      const [parsingTasks, chunkingTasks] = await Promise.all([
        api.getParseTasks().catch(() => []),
        api.getChunkTasks().catch(() => []),
      ]);

      // Map and tag them
      const combined: CombinedTask[] = [
        ...parsingTasks.map((t) => ({ ...t, task_type: "parsing" as const })),
        ...chunkingTasks.map((t) => ({ ...t, task_type: "chunking" as const })),
      ];

      // Sort by created_at descending (newest first)
      combined.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      return combined;
    },
    // Adaptive Polling: dynamically poll every 2s if there are active tasks, else 10s
    refetchInterval: (query) => {
      const tasks = query.state.data as CombinedTask[] | undefined;
      const hasActiveTasks = tasks?.some(
        (t) =>
          t.status === "pending" ||
          t.status === "processing" ||
          t.status === "cancelling"
      );
      return hasActiveTasks ? 2000 : 10_000;
    },
  });
}

/**
 * Hook to fetch a single task's heavy content. Only fetches when enabled.
 */
export function useParseTaskResult(taskId: string | null) {
  return useQuery({
    queryKey: ["document-task", taskId],
    queryFn: () => {
      if (!taskId) {
        throw new Error("Task ID is required");
      }
      return api.getParseTaskResult(taskId);
    },
    enabled: !!taskId,
    gcTime: 0,
    refetchInterval: (query) => {
      const task = query.state.data as ParseTaskResponse | undefined;
      const isActive =
        task?.status === "pending" ||
        task?.status === "processing" ||
        task?.status === "cancelling";
      return isActive ? 2000 : false;
    },
  });
}

export const PRESETS_QUERY_KEY = ["presets"] as const;

export function usePresets() {
  return useQuery<PresetsResponse, Error>({
    queryKey: PRESETS_QUERY_KEY,
    queryFn: () => api.getPresets(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to submit a new parsing task.
 */
export function useSubmitTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fileId,
      filename,
      action = "parse",
      formatOrPreset,
      customMetadata,
      presetData,
    }: {
      fileId: string;
      filename: string;
      action?: "parse" | "chunk";
      formatOrPreset?: string;
      customMetadata?: Record<string, string>;
      presetData?: Preset;
    }) =>
      api.submitTask(
        fileId,
        filename,
        action,
        formatOrPreset,
        customMetadata,
        presetData
      ),
    onSuccess: () => {
      // Invalidate the tasks query so it immediately refetches the new list
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete a parsing or chunking task.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      taskType,
    }: {
      taskId: string;
      taskType: "parsing" | "chunking";
    }) =>
      taskType === "chunking"
        ? api.deleteChunkTask(taskId)
        : api.deleteParseTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

/**
 * Hook to cancel an ongoing parsing or chunking task.
 */
export function useCancelTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      taskType,
    }: {
      taskId: string;
      taskType: "parsing" | "chunking";
    }) =>
      taskType === "chunking"
        ? api.cancelChunkTask(taskId)
        : api.cancelParseTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

/**
 * Hook to retry a failed part of a parsing task.
 */
export function useRetryPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      partIndex,
    }: {
      taskId: string;
      partIndex: number;
    }) => api.retryPart(taskId, partIndex),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: ["document-task", variables.taskId],
      });
    },
  });
}

/**
 * Hook to download a specific part's content.
 */
export function useDownloadPart() {
  return useMutation({
    mutationFn: ({
      taskId,
      partIndex,
    }: {
      taskId: string;
      partIndex: number;
    }) => api.downloadPartContent(taskId, partIndex),
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `part_${variables.partIndex}.md`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

/**
 * Hook to download the full merged content.
 */
export function useDownloadParseFull() {
  return useMutation({
    mutationFn: (taskId: string) => api.downloadParseFullContent(taskId),
    onSuccess: (blob, taskId) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `document_${taskId}_parsed.md`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

// --- Chunking Hooks ---

export const CHUNK_TASKS_QUERY_KEY = ["chunk-tasks"];

export function useChunkTasks() {
  return useQuery({
    queryKey: CHUNK_TASKS_QUERY_KEY,
    queryFn: () => api.getChunkTasks(),
    refetchInterval: (query) => {
      const tasks = query.state.data;
      const hasActiveTasks = tasks?.some(
        (t) =>
          t.status === "pending" ||
          t.status === "processing" ||
          t.status === "cancelling"
      );
      return hasActiveTasks ? 2000 : 10_000;
    },
  });
}

export function useChunkTaskResult(taskId: string | null) {
  return useQuery({
    queryKey: ["chunk-task", taskId],
    queryFn: () => {
      if (!taskId) {
        throw new Error("Task ID is required");
      }
      return api.getChunkTaskResult(taskId);
    },
    enabled: !!taskId,
    gcTime: 0,
    refetchInterval: (query) => {
      const task = query.state.data;
      const isActive =
        task?.status === "pending" ||
        task?.status === "processing" ||
        task?.status === "cancelling";
      return isActive ? 2000 : false;
    },
  });
}

export function useDeleteChunkTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.deleteChunkTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHUNK_TASKS_QUERY_KEY });
    },
  });
}

export function useCancelChunkTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.cancelChunkTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHUNK_TASKS_QUERY_KEY });
    },
  });
}

export function useDownloadChunkFull() {
  return useMutation({
    mutationFn: (taskId: string) => api.downloadChunks(taskId),
    onSuccess: (blob, taskId) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `document_${taskId}_chunks.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useTaskDetailData(
  taskId: string,
  taskType: "parsing" | "chunking" = "parsing"
) {
  const isParsing = taskType === "parsing";
  const parsingQuery = useParseTaskResult(isParsing ? taskId : null);
  const chunkingQuery = useChunkTaskResult(isParsing ? null : taskId);

  const isLoading = isParsing
    ? parsingQuery.isLoading
    : chunkingQuery.isLoading;
  const isError = isParsing ? parsingQuery.isError : chunkingQuery.isError;
  const rawData = isParsing ? parsingQuery.data : chunkingQuery.data;

  let total = 0;
  let completed = 0;
  let progressValue = 0;
  let waiting = 0;
  let processing = 0;
  let failed = 0;
  let cancelled = 0;
  let items: PartResponse[] | ChunkItem[] | undefined;

  if (rawData) {
    if (isParsing) {
      const data = rawData as ParseTaskResponse;
      total = data.total_parts || 0;
      completed = Math.min(data.completed_parts || 0, total);
      waiting =
        data.parts?.filter((p: PartResponse) => p.status === "waiting")
          .length || 0;
      processing =
        data.parts?.filter((p: PartResponse) => p.status === "processing")
          .length || 0;
      failed =
        data.parts?.filter((p: PartResponse) => p.status === "failed").length ||
        0;
      cancelled =
        data.parts?.filter((p: PartResponse) => p.status === "cancelled")
          .length || 0;
      items = data.parts;
    } else {
      const data = rawData as ChunkTaskResponse;
      total = data.total_chunks || 0;
      if (data.status === "completed") {
        completed = total;
      }
      items = data.chunks;
    }
    progressValue = total > 0 ? (completed / total) * 100 : 0;
  }

  return {
    isParsing,
    isLoading,
    isError,
    rawData,
    total,
    completed,
    progressValue,
    waiting,
    processing,
    failed,
    cancelled,
    items,
  };
}
