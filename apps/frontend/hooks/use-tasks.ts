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
        (t) => t.status === "pending" || t.status === "processing"
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
        task?.status === "pending" || task?.status === "processing";
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
    mutationFn: ({ file, format }: { file: File; format?: string }) =>
      api.submitTask(file, format),
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
