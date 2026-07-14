import { useCallback, useEffect, useRef, useState } from "react";
import { api, type UploadResponse } from "@/lib/api";

export interface UploadItem {
  error?: string;
  file: globalThis.File;
  id: string;
  status: "uploading" | "success" | "error";
  uploadResponse?: UploadResponse;
}

export function useUploadItems() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      // Cleanup unsubmitted files when the form unmounts
      const unsubmitted = itemsRef.current.filter(
        (i) => i.status === "success" && i.uploadResponse
      );
      for (const item of unsubmitted) {
        if (item.uploadResponse) {
          api.deleteUpload(item.uploadResponse.file_id).catch(console.error);
        }
      }
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: globalThis.File[]) => {
    const newItems = acceptedFiles.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      status: "uploading" as const,
    }));
    setItems((prev) => [...prev, ...newItems]);

    const uploadItem = async (item: (typeof newItems)[0]) => {
      try {
        const response = await api.uploadFile(item.file);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "success", uploadResponse: response }
              : i
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "error", error: String(err) } : i
          )
        );
      }
    };

    for (const item of newItems) {
      uploadItem(item).catch(console.error);
    }
  }, []);

  const removeFile = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.uploadResponse) {
        api.deleteUpload(item.uploadResponse.file_id).catch(console.error);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  return { items, setItems, onDrop, removeFile };
}
