import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  ChunkTaskResponse,
  EmbedTaskResponse,
  ParseTaskResponse,
} from "@/lib/api";
import { formatProcessingTime } from "@/lib/utils";

export function TaskMasterCard({
  data,
  isParsing,
  total,
  itemTerm,
  itemTermLower,
  completed,
  cancelled,
  progressValue,
  processing,
  waiting,
  failed,
}: {
  data: Omit<ParseTaskResponse, "task_type"> &
    Omit<ChunkTaskResponse, "task_type"> &
    Omit<EmbedTaskResponse, "task_type">;
  isParsing: boolean;
  total: number;
  itemTerm: string;
  itemTermLower: string;
  completed: number;
  cancelled: number;
  progressValue: number;
  processing: number;
  waiting: number;
  failed: number;
}) {
  return (
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
            {total} {itemTerm}
            {cancelled > 0 && ` • ${cancelled} Cancelled`}
            {data.created_at &&
              ` • Started at ${new Date(data.created_at).toLocaleTimeString()}`}
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
              {completed} / {total} {itemTermLower} done
            </span>
            <span className="font-medium">{Math.round(progressValue)}%</span>
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
  );
}
