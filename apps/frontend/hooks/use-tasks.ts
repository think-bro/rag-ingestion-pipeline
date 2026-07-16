import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type CombinedTask,
  type Preset,
  type PresetsResponse,
} from "@/lib/api";

export const TASKS_QUERY_KEY = ["documents-tasks"];

/**
 * Hook to fetch and automatically poll the combined task list.
 */
export function useTasks() {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: async (): Promise<CombinedTask[]> => {
      // Fetch all tasks in parallel
      const [parsingTasks, chunkingTasks, embeddingTasks] = await Promise.all([
        api.getParseTasks().catch(() => []),
        api.getChunkTasks().catch(() => []),
        api.getEmbedTasks().catch(() => []),
      ]);

      // Map and tag them
      const combined: CombinedTask[] = [
        ...parsingTasks.map((t) => ({ ...t, task_type: "parsing" as const })),
        ...chunkingTasks.map((t) => ({ ...t, task_type: "chunking" as const })),
        ...embeddingTasks.map((t) => ({
          ...t,
          task_type: "embedding" as const,
        })),
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

export const PRESETS_QUERY_KEY = ["presets"] as const;

export function usePresets() {
  return useQuery<PresetsResponse, Error>({
    queryKey: PRESETS_QUERY_KEY,
    queryFn: () => api.getPresets(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to submit a new task.
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
      action?: "parse" | "chunk" | "embed";
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
 * Hook to delete a task.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      taskType,
    }: {
      taskId: string;
      taskType: "parsing" | "chunking" | "embedding";
    }) => {
      if (taskType === "embedding") {
        return api.deleteEmbedTask(taskId);
      }
      if (taskType === "chunking") {
        return api.deleteChunkTask(taskId);
      }
      return api.deleteParseTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

/**
 * Hook to cancel an ongoing task.
 */
export function useCancelTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      taskType,
    }: {
      taskId: string;
      taskType: "parsing" | "chunking" | "embedding";
    }) => {
      if (taskType === "embedding") {
        return api.cancelEmbedTask(taskId);
      }
      if (taskType === "chunking") {
        return api.cancelChunkTask(taskId);
      }
      return api.cancelParseTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}
