import {
  Ban,
  CheckCircle2,
  ClockIcon,
  Loader2,
  type LucideIcon,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type StatusType =
  | "waiting"
  | "pending"
  | "processing"
  | "cancelling"
  | "cancelled"
  | "completed"
  | "failed";

interface BadgeConfig {
  colorClass: string;
  icon: LucideIcon;
  iconClass?: string;
  label: string;
}

const statusConfig: Record<StatusType, BadgeConfig> = {
  waiting: {
    icon: ClockIcon,
    label: "Waiting",
    colorClass:
      "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-400 hover:bg-slate-500/20",
  },
  pending: {
    icon: ClockIcon,
    label: "Pending",
    colorClass:
      "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-400 hover:bg-slate-500/20",
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    iconClass: "animate-spin",
    colorClass:
      "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20",
  },
  cancelling: {
    icon: Loader2,
    label: "Cancelling",
    iconClass: "animate-spin",
    colorClass:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-500 hover:bg-amber-500/20",
  },
  cancelled: {
    icon: Ban,
    label: "Cancelled",
    colorClass:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-500 hover:bg-amber-500/20",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    colorClass:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    colorClass:
      "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20",
  },
};

export function StatusBadge({ status }: { status: StatusType | string }) {
  const config = statusConfig[status as StatusType];

  if (!config) {
    return null;
  }

  const Icon = config.icon;

  return (
    <Badge
      className={`flex w-fit items-center gap-1 pl-1 transition-all duration-300 ${config.colorClass}`}
      variant="outline"
    >
      <Icon className={`size-3 ${config.iconClass || ""}`} />
      {config.label}
    </Badge>
  );
}
