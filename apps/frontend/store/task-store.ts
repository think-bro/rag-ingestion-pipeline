import { create } from "zustand";

export interface Task {
  id: string;
  name: string;
  status: "queued" | "processing" | "success" | "failed" | "cancelled";
}

interface TaskState {
  activeTaskId: string | null;
  createDummyTask: () => void;
  handleCancelTask: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  isNewIngestionModalOpen: boolean;
  setActiveTaskId: (id: string | null) => void;
  setNewIngestionModalOpen: (open: boolean) => void;
  tasks: Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  activeTaskId: null,
  isNewIngestionModalOpen: false,
  tasks: [],

  createDummyTask: () => {
    const { tasks } = get();
    const id = Math.random().toString(36).slice(7);
    const statuses: Task["status"][] = [
      "queued",
      "processing",
      "success",
      "failed",
      "cancelled",
    ];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    const newTask: Task = {
      id,
      name: `document_00${tasks.length + 1}.pdf`,
      status: randomStatus,
    };

    set({
      activeTaskId: id,
      tasks: [...tasks, newTask],
    });
  },

  handleCancelTask: (id) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: "cancelled" } : t
      ),
    }));
  },

  handleDeleteTask: (id) => {
    set((state) => ({
      activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  setActiveTaskId: (id) => set({ activeTaskId: id }),
  setNewIngestionModalOpen: (open) => set({ isNewIngestionModalOpen: open }),
}));

export function useTasks() {
  const store = useTaskStore();
  const activeTask = store.tasks.find((t) => t.id === store.activeTaskId);

  return {
    ...store,
    activeTask,
  };
}
