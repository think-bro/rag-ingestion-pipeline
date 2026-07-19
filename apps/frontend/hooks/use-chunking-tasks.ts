import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ChunkItem } from "@/lib/api";

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
    mutationFn: (args: { taskId: string; filename?: string }) =>
      api.downloadChunks(args.taskId),
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      let downloadName = `document_${variables.taskId}_chunks.json`;
      if (variables.filename) {
        const baseName =
          variables.filename.split(".").slice(0, -1).join(".") ||
          variables.filename;
        downloadName = `${baseName}.json`;
      }
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useChunkingTaskDetailData(taskId: string | null) {
  const query = useChunkTaskResult(taskId);

  let total = 0;
  let completed = 0;
  let progressValue = 0;
  const waiting = 0;
  const processing = 0;
  const failed = 0;
  const cancelled = 0;
  let items: ChunkItem[] | undefined;

  if (query.data) {
    const data = query.data;
    total = data.total_chunks || 0;
    if (data.status === "completed") {
      completed = total;
    }
    items = data.items;
    progressValue = total > 0 ? (completed / total) * 100 : 0;
  }

  return {
    isParsing: false,
    isLoading: query.isLoading,
    isError: query.isError,
    rawData: query.data,
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
