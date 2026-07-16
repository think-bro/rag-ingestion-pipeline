import {
  AlertCircle,
  Ban,
  Bug,
  ClockIcon,
  Download,
  Upload,
} from "lucide-react";
import { ItemCard } from "@/components/item-card";
import { StateCard } from "@/components/state-card";
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
import {
  useDownloadParseFull,
  useParsingTaskDetailData,
} from "@/hooks/use-parsing-tasks";
import type {
  ChunkItem,
  ChunkTaskResponse,
  EmbedItem,
  EmbedTaskResponse,
  ParseTaskResponse,
  PartResponse,
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

export function TaskDetailView({
  taskId,
  taskType = "parsing",
}: {
  taskId: string;
  taskType?: "parsing" | "chunking" | "embedding";
}) {
  const isParsingTask = taskType === "parsing";
  const isChunkingTask = taskType === "chunking";
  const isEmbeddingTask = taskType === "embedding";

  const parsingDetail = useParsingTaskDetailData(isParsingTask ? taskId : null);
  const chunkingDetail = useChunkingTaskDetailData(
    isChunkingTask ? taskId : null
  );
  const embeddingDetail = useEmbeddingTaskDetailData(
    isEmbeddingTask ? taskId : null
  );

  let detail:
    | ReturnType<typeof useParsingTaskDetailData>
    | ReturnType<typeof useChunkingTaskDetailData>
    | ReturnType<typeof useEmbeddingTaskDetailData>;
  if (isParsingTask) {
    detail = parsingDetail;
  } else if (isEmbeddingTask) {
    detail = embeddingDetail;
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
    Omit<EmbedTaskResponse, "task_type">;
  const isEmbedding = taskType === "embedding";

  const handleDownloadFull = () => {
    if (isParsing) {
      downloadParseMutation.mutate(taskId);
    } else if (isEmbedding) {
      downloadEmbedMutation.mutate(taskId);
    } else {
      downloadChunksMutation.mutate(taskId);
    }
  };

  let isDownloading = false;
  if (isParsing) {
    isDownloading = downloadParseMutation.isPending;
  } else if (isEmbedding) {
    isDownloading = downloadEmbedMutation.isPending;
  } else {
    isDownloading = downloadChunksMutation.isPending;
  }

  let itemTerm = "Chunks";
  let itemTermLower = "chunks";
  let downloadLabel = "Download as JSON";
  if (isParsing) {
    itemTerm = "Parts";
    itemTermLower = "parts";
    downloadLabel = "Download as MARKDOWN";
  } else if (isEmbedding) {
    itemTerm = "Vectors";
    itemTermLower = "vectors";
    downloadLabel = "Download as PARQUET";
  }

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
            <Button
              className="cursor-pointer"
              disabled={isTaskProcessing || completed === 0 || isDownloading}
              onClick={handleDownloadFull}
            >
              <Download />
              <span className="text-nowrap">{downloadLabel}</span>
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {items
              ?.slice(0, isParsing ? 50 : undefined)
              .map((item, idx: number) => {
                if (isParsing) {
                  const parseItem = item as PartResponse;
                  return (
                    <ItemCard
                      item={parseItem}
                      key={parseItem.part_index}
                      taskId={taskId}
                      type="parse"
                    />
                  );
                }
                if (isEmbedding) {
                  const embedItem = item as EmbedItem;
                  return (
                    <ItemCard
                      item={embedItem}
                      key={embedItem.chunk_id || idx}
                      type="embed"
                    />
                  );
                }
                const chunkItem = item as ChunkItem;
                return (
                  <ItemCard
                    item={chunkItem}
                    key={chunkItem.chunk_id || idx}
                    type="chunk"
                  />
                );
              })}
            {!isParsing && items && total > 50 && (
              <div className="mt-2 text-center text-muted-foreground text-sm">
                + {total - (items?.length || 0)} more {itemTermLower} not shown.{" "}
                {downloadLabel} to view all.
              </div>
            )}
          </div>
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
