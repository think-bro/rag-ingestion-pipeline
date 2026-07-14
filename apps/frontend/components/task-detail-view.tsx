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
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  useDownloadChunkFull,
  useDownloadParseFull,
  useTaskDetailData,
} from "@/hooks/use-tasks";
import type {
  ChunkItem,
  ChunkTaskResponse,
  ParseTaskResponse,
  PartResponse,
} from "@/lib/api";
import { formatProcessingTime } from "@/lib/utils";
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
  taskType?: "parsing" | "chunking";
}) {
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
  } = useTaskDetailData(taskId, taskType);

  const { setActiveTask } = useTaskStore();
  const downloadParseMutation = useDownloadParseFull();
  const downloadChunksMutation = useDownloadChunkFull();

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

  const data = rawData as ParseTaskResponse & ChunkTaskResponse;

  const handleDownloadFull = () => {
    if (isParsing) {
      downloadParseMutation.mutate(taskId);
    } else {
      downloadChunksMutation.mutate(taskId);
    }
  };

  const isDownloading = isParsing
    ? downloadParseMutation.isPending
    : downloadChunksMutation.isPending;

  const isTaskProcessing = ["pending", "processing", "cancelling"].includes(
    data.status
  );

  return (
    <ScrollArea className="w-full flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        {/* Master Card */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="text-xl">
                {data.filename || "Document"}
              </CardTitle>
              <CardDescription>
                {data.file_size
                  ? `${(data.file_size / 1024 / 1024).toFixed(2)} MB`
                  : "Unknown Size"}
                {" • "}
                {isParsing ? `${data.page_count || 0} Pages • ` : ""}
                {total} {isParsing ? "Parts" : "Chunks"}
                {cancelled > 0 && ` • ${cancelled} Cancelled`}
                {data.created_at &&
                  ` • Started at ${new Date(
                    data.created_at
                  ).toLocaleTimeString()}`}
                {data.status === "completed" &&
                  typeof data.processing_time === "number" && (
                    <>
                      {" • Total time: "}
                      {formatProcessingTime(data.processing_time)}
                    </>
                  )}
              </CardDescription>
            </div>
            <StatusBadge status={data.status} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {completed} / {total} {isParsing ? "parts" : "chunks"} done
                </span>
                <span className="font-medium">
                  {Math.round(progressValue)}%
                </span>
              </div>
              <Progress className="h-2" value={progressValue} />
            </div>

            {isParsing && (
              <div className="mt-2 flex w-full items-center justify-between font-medium text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                  <span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                  {completed} Done
                </div>
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-500">
                  <span className="size-2 animate-pulse rounded-full bg-blue-600 dark:bg-blue-500" />
                  {processing} Processing
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-muted-foreground" />
                  {waiting} Waiting
                </div>
                <div className="flex items-center gap-1.5 text-destructive">
                  <span className="size-2 rounded-full bg-destructive" />
                  {failed} Failed
                </div>
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                  <span className="size-2 rounded-full bg-amber-600 dark:bg-amber-500" />
                  {cancelled} Cancelled
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Parts List */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <h3 className="font-semibold text-lg">
              {isParsing ? "Parts" : "Chunks"} ({total})
            </h3>
            <Button
              className="cursor-pointer"
              disabled={isTaskProcessing || completed === 0 || isDownloading}
              onClick={handleDownloadFull}
            >
              <Download />
              <span className="text-nowrap">
                {isParsing ? "Download Merged Document" : "Download JSON"}
              </span>
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {items?.map((item, idx: number) => {
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
              const chunkItem = item as ChunkItem;
              return (
                <ItemCard
                  item={chunkItem}
                  key={chunkItem.chunk_id || idx}
                  type="chunk"
                />
              );
            })}
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
