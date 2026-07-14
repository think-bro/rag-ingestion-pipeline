"use client";

import { Bot, PlusIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { TaskItem } from "@/components/task-item";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTasks } from "@/hooks/use-tasks";
import { useTaskStore } from "@/store/task-store";

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { isMobile } = useSidebar();
  const { setActiveTask } = useTaskStore();
  const { data: tasks = [] } = useTasks();

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="RAG Ingestion Pipeline"
            >
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bot className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">RAG</span>
                  <span className="truncate text-xs">Ingestion Pipeline</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="flex flex-col overflow-hidden">
        {/* Fixed Action Group */}
        <SidebarGroup className="shrink-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="h-10 w-full cursor-pointer gap-2 bg-primary font-medium text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                onClick={() => setActiveTask(null)}
                tooltip="New Ingestion"
              >
                <PlusIcon className="size-4" />
                <span>New Ingestion</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Scrollable Tasks Group */}
        <SidebarGroup className="flex min-h-0 flex-1 flex-col overflow-hidden pt-0">
          <SidebarGroupLabel className="shrink-0 px-2">
            Ingestion Jobs
          </SidebarGroupLabel>
          <div className="no-scrollbar flex-1 overflow-y-auto">
            <SidebarMenu className="gap-1.5">
              {tasks.length === 0 ? (
                <SidebarMenuItem>
                  <div className="rounded-md border border-sidebar-border border-dashed p-3 text-muted-foreground text-sm group-data-[collapsible=icon]:hidden">
                    No ingestion jobs yet.
                  </div>
                </SidebarMenuItem>
              ) : (
                tasks.map((task) => (
                  <TaskItem
                    isMobile={isMobile}
                    key={task.task_id}
                    onSelectTask={setActiveTask}
                    task={task}
                  />
                ))
              )}
            </SidebarMenu>
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
