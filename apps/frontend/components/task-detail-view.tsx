import {
  AlertCircle,
  Ban,
  Bug,
  ClockIcon,
  Download,
  Upload,
} from "lucide-react";
import { StateCard } from "@/components/state-card";
import { TaskItemList } from "@/components/task-item-list";
import { TaskMasterCard } from "@/components/task-master-card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  useChunkingTaskDetailData,
  useDownloadChunkFull,
} from "@/hooks/use-chunking-tasks";
import {
  useDownloadEmbedFull,
  useEmbeddingTaskDetailData,
} from "@/hooks/use-embedding-tasks";
import { useIndexingTaskDetailData } from "@/hooks/use-indexing-tasks";
import {
  useDownloadParseFull,
  useParsingTaskDetailData,
} from "@/hooks/use-parsing-tasks";
import type {
  ChunkTaskResponse,
  EmbedTaskResponse,
  IndexTaskResponse,
  ParseTaskResponse,
} from "@/lib/api";
import { useTaskStore } from "@/store/task-store";

function TaskLoadingState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-muted-foreground">
      <ClockIcon className="mb-4 size-8 animate-pulse text-amber-500" />
      <h3 className="font-medium text-foreground text-lg">{title}</h3>
      {description && <p className="mt-2 text-sm">{description}</p>}
    </div>
  );
}

function TaskErrorState({
  error,
  onClear,
}: {
  error?: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center text-destructive">
      <StateCard
        action={{
          label: (
            <>
              <Upload data-icon="inline-start" />
              Try another file
            </>
          ),
          onClick: onClear,
        }}
        className="border-destructive/20 bg-destructive/5 hover:border-destructive/30"
        description={
          error || "An unexpected error occurred while fetching the document."
        }
        icons={[Ban, AlertCircle, Bug]}
        title="Document Processing Failed"
      />
    </div>
  );
}

const TASK_UI_CONFIG = {
  parsing: {
    itemTerm: "Parts",
    itemTermLower: "parts",
    downloadLabel: "Download as MARKDOWN",
  },
  chunking: {
    itemTerm: "Chunks",
    itemTermLower: "chunks",
    downloadLabel: "Download as JSON",
  },
  embedding: {
    itemTerm: "Vectors",
    itemTermLower: "vectors",
    downloadLabel: "Download as PARQUET",
  },
  indexing: {
    itemTerm: "Indexes",
    itemTermLower: "indexes",
    downloadLabel: "Open your database",
  },
};

export function TaskDetailView({
  taskId,
  taskType = "parsing",
}: {
  taskId: string;
  taskType?: "parsing" | "chunking" | "embedding" | "indexing";
}) {
  const isParsingTask = taskType === "parsing";
  const isChunkingTask = taskType === "chunking";
  const isEmbeddingTask = taskType === "embedding";
  const isIndexingTask = taskType === "indexing";

  const parsingDetail = useParsingTaskDetailData(isParsingTask ? taskId : null);
  const chunkingDetail = useChunkingTaskDetailData(
    isChunkingTask ? taskId : null
  );
  const embeddingDetail = useEmbeddingTaskDetailData(
    isEmbeddingTask ? taskId : null
  );

  const indexingDetail = useIndexingTaskDetailData(
    isIndexingTask ? taskId : null
  );

  let detail:
    | ReturnType<typeof useParsingTaskDetailData>
    | ReturnType<typeof useChunkingTaskDetailData>
    | ReturnType<typeof useEmbeddingTaskDetailData>
    | ReturnType<typeof useIndexingTaskDetailData>;
  if (isParsingTask) {
    detail = parsingDetail;
  } else if (isEmbeddingTask) {
    detail = embeddingDetail;
  } else if (isIndexingTask) {
    detail = indexingDetail;
  } else {
    detail = chunkingDetail;
  }

  const {
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
  } = detail;

  const { setActiveTask } = useTaskStore();
  const downloadParseMutation = useDownloadParseFull();
  const downloadChunksMutation = useDownloadChunkFull();
  const downloadEmbedMutation = useDownloadEmbedFull();

  if (isLoading) {
    return <TaskLoadingState title="Loading task details..." />;
  }

  if (isError || !rawData) {
    return (
      <TaskErrorState
        error={rawData?.error}
        onClear={() => setActiveTask(null)}
      />
    );
  }

  const data = rawData as Omit<ParseTaskResponse, "task_type"> &
    Omit<ChunkTaskResponse, "task_type"> &
    Omit<EmbedTaskResponse, "task_type"> &
    Omit<IndexTaskResponse, "task_type">;
  const isEmbedding = taskType === "embedding";
  const isIndexing = taskType === "indexing";

  const handleDownloadFull = () => {
    if (isParsing) {
      downloadParseMutation.mutate({ taskId, filename: data.filename });
    } else if (isEmbedding) {
      downloadEmbedMutation.mutate({ taskId, filename: data.filename });
    } else {
      downloadChunksMutation.mutate({ taskId, filename: data.filename });
    }
  };

  let isDownloading = false;
  if (isParsing) {
    isDownloading = downloadParseMutation.isPending;
  } else if (isEmbedding) {
    isDownloading = downloadEmbedMutation.isPending;
  } else if (isIndexing) {
    isDownloading = false;
  } else {
    isDownloading = downloadChunksMutation.isPending;
  }

  const { itemTerm, itemTermLower, downloadLabel } = TASK_UI_CONFIG[taskType];
  const isTaskProcessing = ["pending", "processing", "cancelling"].includes(
    data.status
  );

  return (
    <ScrollArea className="w-full flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        {/* Master Card */}
        <TaskMasterCard
          cancelled={cancelled}
          completed={completed}
          data={data}
          failed={failed}
          isParsing={isParsing}
          itemTerm={itemTerm}
          itemTermLower={itemTermLower}
          processing={processing}
          progressValue={progressValue}
          total={total}
          waiting={waiting}
        />

        {/*List */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <h3 className="font-semibold text-lg">
              {itemTerm} ({total})
            </h3>
            {/* TODO: Implement a feature to create and download a snapshot of the vector database for indexing tasks */}
            {!isIndexing && (
              <Button
                className="cursor-pointer"
                disabled={
                  isTaskProcessing ||
                  completed === 0 ||
                  isDownloading ||
                  data.status === "failed"
                }
                onClick={handleDownloadFull}
              >
                <Download />
                <span className="text-nowrap">{downloadLabel}</span>
              </Button>
            )}
          </div>
          <TaskItemList
            downloadLabel={downloadLabel}
            items={items}
            itemTermLower={itemTermLower}
            taskId={taskId}
            taskType={taskType}
            total={total}
          />
        </div>

        {data.status === "failed" && (
          <TaskErrorState
            error={data.error}
            onClear={() => setActiveTask(null)}
          />
        )}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
