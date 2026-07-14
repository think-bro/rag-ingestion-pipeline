import { create } from "zustand";

interface TaskState {
  activeTaskId: string | null;
  activeTaskType: "parsing" | "chunking" | null;
  isNewIngestionModalOpen: boolean;
  setActiveTask: (
    id: string | null,
    type?: "parsing" | "chunking" | null
  ) => void;
  setNewIngestionModalOpen: (open: boolean) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  activeTaskId: null,
  activeTaskType: null,
  isNewIngestionModalOpen: false,

  setActiveTask: (id, type = "parsing") =>
    set({ activeTaskId: id, activeTaskType: id ? type : null }),
  setNewIngestionModalOpen: (open) => set({ isNewIngestionModalOpen: open }),
}));
