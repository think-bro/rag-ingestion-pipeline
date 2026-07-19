import { useQuery } from "@tanstack/react-query";
import { api, type IndexItem, type IndexTaskResponse } from "@/lib/api";

export function useIndexTaskResult(taskId: string | null) {
  return useQuery({
    queryKey: ["index-task", taskId],
    queryFn: () => {
      if (!taskId) {
        throw new Error("Task ID is required");
      }
      return api.getIndexTaskResult(taskId);
    },
    enabled: !!taskId,
    gcTime: 0,
    refetchInterval: (query) => {
      const task = query.state.data as IndexTaskResponse | undefined;
      const isActive =
        task?.status === "pending" ||
        task?.status === "processing" ||
        task?.status === "cancelling";
      return isActive ? 2000 : false;
    },
  });
}

export function useIndexDBs() {
  return useQuery({
    queryKey: ["vector-dbs"],
    queryFn: () => api.getVectorDBs(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useIndexingTaskDetailData(taskId: string | null) {
  const query = useIndexTaskResult(taskId);

  let total = 0;
  let completed = 0;
  let progressValue = 0;
  const waiting = 0;
  const processing = 0;
  const failed = 0;
  const cancelled = 0;
  let items: IndexItem[] | undefined;

  if (query.data) {
    const data = query.data;
    total = data.total_vectors || 0;
    completed = data.completed_vectors || 0;

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
