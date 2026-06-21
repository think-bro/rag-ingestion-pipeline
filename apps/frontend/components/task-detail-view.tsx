import { Loader2 } from "lucide-react";
import { useTaskResult } from "@/hooks/use-tasks";

export function TaskDetailView({ taskId }: { taskId: string }) {
  const { data, isLoading, isError } = useTaskResult(taskId);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <p>Loading task details...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-destructive">
        <p>Failed to load task details.</p>
      </div>
    );
  }

  if (data.status === "pending" || data.status === "processing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
        <h3 className="font-medium text-foreground text-lg">
          Processing {data.filename}
        </h3>
        <p className="mt-2 text-sm">
          Please wait while the document is being parsed...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="mb-6">
        <h2 className="font-bold text-2xl text-foreground tracking-tight">
          {data.filename}
        </h2>
        <p className="text-muted-foreground text-sm">
          Status: {data.status} • Format: {data.output_format}
        </p>
      </div>

      <div className="flex-1 overflow-auto rounded-md border bg-muted/30 p-4">
        <pre className="whitespace-pre-wrap text-sm">
          {data.content || "No content available."}
        </pre>
      </div>
    </div>
  );
}
