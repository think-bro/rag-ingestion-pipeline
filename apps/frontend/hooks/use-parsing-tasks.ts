import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ParseTaskResponse, type PartResponse } from "@/lib/api";
import { TASKS_QUERY_KEY } from "./use-tasks";

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

export function useDownloadParseFull() {
  return useMutation({
    mutationFn: (args: { taskId: string; filename?: string }) =>
      api.downloadParseFullContent(args.taskId),
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      let downloadName = `document_${variables.taskId}_parsed.md`;
      if (variables.filename) {
        const baseName =
          variables.filename.split(".").slice(0, -1).join(".") ||
          variables.filename;
        downloadName = `${baseName}.md`;
      }
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useParsingTaskDetailData(taskId: string | null) {
  const query = useParseTaskResult(taskId);

  let total = 0;
  let completed = 0;
  let progressValue = 0;
  let waiting = 0;
  let processing = 0;
  let failed = 0;
  let cancelled = 0;
  let items: PartResponse[] | undefined;

  if (query.data) {
    const data = query.data;
    total = data.total_parts || 0;
    completed = Math.min(data.completed_parts || 0, total);
    waiting = data.items?.filter((p) => p.status === "waiting").length || 0;
    processing =
      data.items?.filter((p) => p.status === "processing").length || 0;
    failed = data.items?.filter((p) => p.status === "failed").length || 0;
    cancelled = data.items?.filter((p) => p.status === "cancelled").length || 0;
    items = data.items;
    progressValue = total > 0 ? (completed / total) * 100 : 0;
  }

  return {
    isParsing: true,
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
