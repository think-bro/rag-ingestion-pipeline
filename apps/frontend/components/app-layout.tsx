"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { NewIngestionModal } from "@/components/new-ingestion-modal";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useTasks } from "@/hooks/use-tasks";
import { useTaskStore } from "@/store/task-store";

function LayoutContent({ children }: { children: ReactNode }) {
  const { activeTaskId } = useTaskStore();
  const { data: tasks } = useTasks();
  const activeTask = tasks?.find((t) => t.task_id === activeTaskId);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              orientation="vertical"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {activeTask ? activeTask.filename : "New Ingestion"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LayoutContent>{children}</LayoutContent>
      <NewIngestionModal />
    </>
  );
}
