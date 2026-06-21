import { create } from "zustand";

interface TaskState {
  activeTaskId: string | null;
  isNewIngestionModalOpen: boolean;
  setActiveTaskId: (id: string | null) => void;
  setNewIngestionModalOpen: (open: boolean) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  activeTaskId: null,
  isNewIngestionModalOpen: false,

  setActiveTaskId: (id) => set({ activeTaskId: id }),
  setNewIngestionModalOpen: (open) => set({ isNewIngestionModalOpen: open }),
}));
