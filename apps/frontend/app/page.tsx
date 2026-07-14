"use client";

import { DatabaseSearch, FileText, Plus, Upload } from "lucide-react";

import { StateCard } from "@/components/state-card";
import { TaskDetailView } from "@/components/task-detail-view";
import { useTaskStore } from "@/store/task-store";

export default function Page() {
  const { activeTaskId, activeTaskType, setNewIngestionModalOpen } =
    useTaskStore();

  if (activeTaskId) {
    return (
      <TaskDetailView
        taskId={activeTaskId}
        taskType={activeTaskType || "parsing"}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center p-6">
      <StateCard
        action={{
          label: (
            <>
              <Plus />
              Start your ingestion jobs
            </>
          ),
          onClick: () => setNewIngestionModalOpen(true),
        }}
        description="Upload a PDF to parse, chunk, and embed it into your vector store."
        icons={[FileText, Upload, DatabaseSearch]}
        title="No ingestion jobs yet"
      />
    </div>
  );
}
