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
import type { ChunkItem, PartResponse } from "@/lib/api";
import { formatProcessingTime } from "@/lib/utils";

export type ItemCardProps =
  | { type: "parse"; item: PartResponse; taskId: string }
  | { type: "chunk"; item: ChunkItem };

export function ItemCard(props: ItemCardProps) {
  // const downloadMutation = useDownloadPart();
  const retryMutation = useRetryPart();

  // const handleDownload = () => {
  //   if (props.type === "parse") downloadMutation.mutate({ taskId: props.taskId, partIndex: props.item.part_index });
  // };

  const handleRetry = () => {
    if (props.type === "parse") {
      retryMutation.mutate({
        taskId: props.taskId,
        partIndex: props.item.part_index,
      });
    }
  };

  return (
    <Card className="group shadow-sm">
      <div className="flex flex-row items-center justify-between px-4">
        <div className="flex flex-row gap-6">
          {props.type === "parse" ? (
            <>
              <span className="font-semibold text-sm">
                Part #{String(props.item.part_index + 1).padStart(3, "0")}
              </span>
              <span className="text-muted-foreground text-sm">
                Pages {props.item.page_start} to {props.item.page_end}
                {props.item.status === "completed" &&
                  typeof props.item.processing_time === "number" && (
                    <>
                      {" • Completed in "}
                      {formatProcessingTime(props.item.processing_time)}
                    </>
                  )}
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold text-sm">
                Chunk #
                {String(props.item.metadata.chunk_index + 1).padStart(3, "0")}
              </span>
              <span className="text-muted-foreground text-sm">
                {props.item.metadata.token_count} tokens •{" "}
                {props.item.metadata.char_count} chars
              </span>
            </>
          )}
        </div>

        <div className="flex items-center">
          {props.type === "parse" && <StatusBadge status={props.item.status} />}
          {props.type === "chunk" && <StatusBadge status={"completed"} />}

          {props.type === "parse" && props.item.status === "failed" && (
            <div className="flex w-0 items-center justify-end overflow-hidden opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:w-8 group-hover:opacity-100">
              {/* TODO: Uncomment this when part downloading is re-enabled. 
                  NOTE: When you do, remember to change the wrapper condition above 
                  back to \`(part.status === "completed" || part.status === "failed")\` */}
              {/* {props.item.status === "completed" && (
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
              {props.item.status === "failed" && (
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
