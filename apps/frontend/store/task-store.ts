import { create } from "zustand";

interface TaskState {
  activeTaskId: string | null;
  activeTaskType: "parsing" | "chunking" | "embedding" | "indexing" | null;
  isNewIngestionModalOpen: boolean;
  setActiveTask: (
    id: string | null,
    type?: "parsing" | "chunking" | "embedding" | "indexing" | null
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
