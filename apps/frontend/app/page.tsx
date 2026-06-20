"use client";

import { DatabaseSearch, FileText, Plus, Upload } from "lucide-react";
import { CallToActionCard } from "@/components/cta-card";
import { useTasks } from "@/store/task-store";

export default function Page() {
  const { createDummyTask } = useTasks();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center p-6">
      <CallToActionCard
        action={{
          label: (
            <>
              <Plus />
              Start your ingestion jobs
            </>
          ),
          onClick: () => createDummyTask(),
        }}
        description="Upload a PDF to parse, chunk, and embed it into your vector store."
        icons={[FileText, Upload, DatabaseSearch]}
        title="No ingestion jobs yet"
      />
    </div>
  );
}
