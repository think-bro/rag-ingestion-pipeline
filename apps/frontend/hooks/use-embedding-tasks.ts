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

export function useEmbedModels() {
  return useQuery({
    queryKey: ["embed-models"],
    queryFn: () => api.getEmbedModels(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useDownloadEmbedFull() {
  return useMutation({
    mutationFn: (args: { taskId: string; filename?: string }) =>
      api.downloadEmbeddings(args.taskId),
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      let downloadName = `document_${variables.taskId}_embeddings.parquet`;
      if (variables.filename) {
        const baseName =
          variables.filename.split(".").slice(0, -1).join(".") ||
          variables.filename;
        downloadName = `${baseName}.parquet`;
      }
      link.setAttribute("download", downloadName);
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
