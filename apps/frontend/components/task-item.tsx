"use client";

import {
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCancelTask, useDeleteTask } from "@/hooks/use-tasks";
import type { CombinedTask } from "@/lib/api";
import { useTaskStore } from "@/store/task-store";

interface TaskItemProps {
  isMobile: boolean;
  onSelectTask: (
    id: string,
    type: "parsing" | "chunking" | "embedding"
  ) => void;
  task: CombinedTask;
}

export function TaskItem({ task, isMobile, onSelectTask }: TaskItemProps) {
  const { activeTaskId, setActiveTask } = useTaskStore();
  const isActive = activeTaskId === task.task_id;
  const { mutateAsync: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { mutateAsync: cancelTask, isPending: isCancelling } = useCancelTask();

  let StatusIcon = Loader2Icon;
  let iconColor = "text-muted-foreground";

  if (task.status === "pending") {
    StatusIcon = ClockIcon;
    iconColor = "text-slate-500";
  } else if (task.status === "processing") {
    iconColor = "text-blue-500 animate-spin";
  } else if (task.status === "cancelling") {
    iconColor = "text-orange-500 animate-spin";
  } else if (task.status === "completed") {
    StatusIcon = CheckCircle2Icon;
    iconColor = "text-green-500";
  } else if (task.status === "failed") {
    StatusIcon = XCircleIcon;
    iconColor = "text-red-500";
  } else if (task.status === "cancelled") {
    StatusIcon = BanIcon;
    iconColor = "text-orange-500";
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="h-10 cursor-pointer border border-transparent transition-all duration-200 data-active:border-sidebar-border data-active:shadow-xs"
        isActive={isActive}
        onClick={() => onSelectTask(task.task_id, task.task_type)}
        tooltip={task.filename}
      >
        <StatusIcon className={`size-4 shrink-0 ${iconColor}`} />
        <span className="truncate text-left font-medium">{task.filename}</span>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="top-1/2! right-2! flex size-7 -translate-y-1/2! items-center justify-center rounded-md text-sidebar-foreground transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
            showOnHover
          >
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isMobile ? "end" : "start"}
          className="w-48"
          side={isMobile ? "bottom" : "right"}
        >
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement pin ingestion
            }}
          >
            <PinIcon className="mr-2 size-4 text-muted-foreground" />
            <span>Pin Ingestion</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement rename ingestion
            }}
          >
            <PencilIcon className="mr-2 size-4 text-muted-foreground" />
            <span>Rename Ingestion</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={
              isCancelling ||
              (task.status !== "pending" && task.status !== "processing")
            }
            onClick={(e) => {
              e.stopPropagation();
              cancelTask({ taskId: task.task_id, taskType: task.task_type });
            }}
          >
            <BanIcon className="mr-2 size-4 text-orange-500" />
            <span>{isCancelling ? "Cancelling..." : "Cancel"}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
            disabled={
              isDeleting ||
              task.status === "processing" ||
              task.status === "cancelling"
            }
            onClick={(e) => {
              e.stopPropagation();
              deleteTask({ taskId: task.task_id, taskType: task.task_type });
              if (isActive) {
                setActiveTask(null);
              }
            }}
          >
            <Trash2Icon className="mr-2 size-4" />
            <span>{isDeleting ? "Deleting..." : "Delete"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
