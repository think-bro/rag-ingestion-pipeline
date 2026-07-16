import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type EmbedItem, type EmbedTaskResponse } from "@/lib/api";

export function useEmbedTaskResult(taskId: string | null) {
  return useQuery({
    queryKey: ["embed-task", taskId],
    queryFn: () => {
      if (!taskId) {
        throw new Error("Task ID is required");
      }
      return api.getEmbedTaskResult(taskId);
    },
    enabled: !!taskId,
    gcTime: 0,
    refetchInterval: (query) => {
      const task = query.state.data as EmbedTaskResponse | undefined;
      const isActive =
        task?.status === "pending" ||
        task?.status === "processing" ||
        task?.status === "cancelling";
      return isActive ? 2000 : false;
    },
  });
}

export function useDownloadEmbedFull() {
  return useMutation({
    mutationFn: (taskId: string) => api.downloadEmbeddings(taskId),
    onSuccess: (blob, taskId) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `document_${taskId}_embeddings.parquet`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useEmbeddingTaskDetailData(taskId: string | null) {
  const query = useEmbedTaskResult(taskId);

  let total = 0;
  let completed = 0;
  let progressValue = 0;
  const waiting = 0;
  const processing = 0;
  const failed = 0;
  const cancelled = 0;
  let items: EmbedItem[] | undefined;

  if (query.data) {
    const data = query.data;
    total = data.total_vectors || 0;
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
