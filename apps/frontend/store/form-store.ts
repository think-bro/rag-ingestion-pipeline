import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface FormState {
  denseModel: string;
  format: string;
  preset: string;
  setDenseModel: (model: string) => void;
  setFormat: (format: string) => void;
  setPreset: (preset: string) => void;
  setSparseLanguage: (lang: string) => void;
  setSparseModel: (model: string) => void;
  setTaskType: (
    type: "unselected" | "parse" | "chunk" | "embed" | "index"
  ) => void;
  setVectorDb: (db: string) => void;
  setVectorDbCollection: (collection: string) => void;
  setVectorDbUrl: (url: string) => void;
  sparseLanguage: string;
  sparseModel: string;
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
      denseModel: "unselected",
      sparseModel: "unselected",
      sparseLanguage: "unselected",
      format: "markdown",
      vectorDb: "unselected",
      vectorDbCollection: "",
      vectorDbUrl: "",
      setTaskType: (taskType) => set({ taskType }),
      setPreset: (preset) => set({ preset }),
      setDenseModel: (denseModel) => set({ denseModel }),
      setSparseModel: (sparseModel) => set({ sparseModel }),
      setSparseLanguage: (sparseLanguage) => set({ sparseLanguage }),
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
