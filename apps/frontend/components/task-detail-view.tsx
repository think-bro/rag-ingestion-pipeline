import { AlertCircle, Ban, Bug, Loader2, Upload } from "lucide-react";
import { StateCard } from "@/components/state-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTaskResult } from "@/hooks/use-tasks";
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
      <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
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
    <div className="flex flex-1 items-center justify-center p-6 text-destructive">
      <StateCard
        action={{
          label: (
            <>
              <Upload />
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

export function TaskDetailView({ taskId }: { taskId: string }) {
  const { data, isLoading, isError } = useTaskResult(taskId);
  const { setActiveTaskId } = useTaskStore();

  if (isLoading) {
    return <TaskLoadingState title="Loading task details..." />;
  }
  if (isError || !data || data.status === "failed") {
    return (
      <TaskErrorState
        error={data?.error}
        onClear={() => setActiveTaskId(null)}
      />
    );
  }
  if (data.status === "pending" || data.status === "processing") {
    return (
      <TaskLoadingState
        description="Please wait while the document is being parsed..."
        title={`Processing ${data.filename || "Document"}`}
      />
    );
  }

  return (
    <ScrollArea className="w-full flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 p-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <pre className="whitespace-pre-wrap text-sm">{data.content}</pre>
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
