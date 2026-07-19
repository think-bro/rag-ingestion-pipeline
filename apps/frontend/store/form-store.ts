import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface FormState {
  embedModel: string;
  format: string;
  preset: string;
  setEmbedModel: (model: string) => void;
  setFormat: (format: string) => void;
  setPreset: (preset: string) => void;
  setTaskType: (type: "unselected" | "parse" | "chunk" | "embed") => void;
  taskType: "unselected" | "parse" | "chunk" | "embed";
}

export const useFormStore = create<FormState>()(
  persist(
    (set) => ({
      taskType: "unselected",
      preset: "unselected",
      embedModel: "unselected",
      format: "markdown",
      setTaskType: (taskType) => set({ taskType }),
      setPreset: (preset) => set({ preset }),
      setEmbedModel: (embedModel) => set({ embedModel }),
      setFormat: (format) => set({ format }),
    }),
    {
      name: "ingestion-form-preferences",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
