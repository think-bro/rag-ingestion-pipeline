import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type TaskResultResponse } from "@/lib/api";

export const TASKS_QUERY_KEY = ["documents-tasks"];

/**
 * Hook to fetch and automatically poll the task list.
 */
export function useTasks() {
  return useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: () => api.getTasks(),
    // Adaptive Polling: dynamically poll every 2s if there are active tasks, else 10s
    refetchInterval: (query) => {
      const tasks = query.state.data as TaskResultResponse[] | undefined;
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
export function useTaskResult(taskId: string | null) {
  return useQuery({
    queryKey: ["document-task", taskId],
    queryFn: () => {
      if (!taskId) {
        throw new Error("Task ID is required");
      }
      return api.getTaskResult(taskId);
    },
    enabled: !!taskId,
    gcTime: 0,
    refetchInterval: (query) => {
      const task = query.state.data as TaskResultResponse | undefined;
      const isActive =
        task?.status === "pending" ||
        task?.status === "processing" ||
        task?.status === "cancelling";
      return isActive ? 2000 : false;
    },
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
      format,
    }: {
      fileId: string;
      filename: string;
      format?: string;
    }) => api.submitTask(fileId, filename, format),
    onSuccess: () => {
      // Invalidate the tasks query so it immediately refetches the new list
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete a parsing task.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
}

/**
 * Hook to cancel an ongoing parsing task.
 */
export function useCancelTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => api.cancelTask(taskId),
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
export function useDownloadFull() {
  return useMutation({
    mutationFn: (taskId: string) => api.downloadFullContent(taskId),
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
