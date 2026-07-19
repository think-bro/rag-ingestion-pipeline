import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface FormState {
  embedModel: string;
  format: string;
  preset: string;
  setEmbedModel: (model: string) => void;
  setFormat: (format: string) => void;
  setPreset: (preset: string) => void;
  setTaskType: (
    type: "unselected" | "parse" | "chunk" | "embed" | "index"
  ) => void;
  setVectorDb: (db: string) => void;
  setVectorDbCollection: (collection: string) => void;
  setVectorDbUrl: (url: string) => void;
  taskType: "unselected" | "parse" | "chunk" | "embed" | "index";
  vectorDb: string;
  vectorDbCollection: string;
  vectorDbUrl: string;
}

export const useFormStore = create<FormState>()(
  persist(
    (set) => ({
      taskType: "unselected",
      preset: "unselected",
      embedModel: "unselected",
      format: "markdown",
      vectorDb: "unselected",
      vectorDbCollection: "",
      vectorDbUrl: "",
      setTaskType: (taskType) => set({ taskType }),
      setPreset: (preset) => set({ preset }),
      setEmbedModel: (embedModel) => set({ embedModel }),
      setFormat: (format) => set({ format }),
      setVectorDb: (vectorDb) => set({ vectorDb }),
      setVectorDbCollection: (vectorDbCollection) =>
        set({ vectorDbCollection }),
      setVectorDbUrl: (vectorDbUrl) => set({ vectorDbUrl }),
    }),
    {
      name: "ingestion-form-preferences",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
