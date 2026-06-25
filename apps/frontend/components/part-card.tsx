import { RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRetryPart } from "@/hooks/use-tasks";
import type { PartResponse } from "@/lib/api";
import { formatProcessingTime } from "@/lib/utils";

export function PartCard({
  taskId,
  part,
}: {
  taskId: string;
  part: PartResponse;
}) {
  // const downloadMutation = useDownloadPart();
  const retryMutation = useRetryPart();

  // const handleDownload = () => {
  //   downloadMutation.mutate({ taskId, partIndex: part.part_index });
  // };

  const handleRetry = () => {
    retryMutation.mutate({ taskId, partIndex: part.part_index });
  };

  return (
    <Card className="group shadow-sm">
      <div className="flex flex-row items-center justify-between px-4">
        <div className="flex flex-row gap-6">
          <span className="font-semibold text-sm">
            Part #{String(part.part_index + 1).padStart(3, "0")}
          </span>
          <span className="text-muted-foreground text-sm">
            Pages {part.page_start} to {part.page_end}
            {part.status === "completed" &&
              typeof part.processing_time === "number" && (
                <>
                  {" • Completed in "}
                  {formatProcessingTime(part.processing_time)}
                </>
              )}
          </span>
        </div>

        <div className="flex items-center">
          <StatusBadge status={part.status} />

          {(part.status === "completed" || part.status === "failed") && (
            <div className="flex w-0 items-center justify-end overflow-hidden opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:w-8 group-hover:opacity-100">
              {/* {part.status === "completed" && (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      className="size-8 shrink-0 cursor-pointer"
                      disabled={downloadMutation.isPending}
                      onClick={handleDownload}
                      size="icon"
                      variant="ghost"
                    >
                      <Download className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download Part</p>
                  </TooltipContent>
                </Tooltip>
              )} */}
              {part.status === "failed" && (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      className="size-8 shrink-0 cursor-pointer"
                      disabled={retryMutation.isPending}
                      onClick={handleRetry}
                      size="icon"
                      variant="ghost"
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Retry Part</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
