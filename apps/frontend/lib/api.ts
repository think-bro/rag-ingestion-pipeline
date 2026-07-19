export type TaskStatus =
  | "pending"
  | "processing"
  | "cancelling"
  | "completed"
  | "failed"
  | "cancelled";

export interface PresetConfigOverrides {
  chunk_overlap: number;
  chunk_size: number;
  custom_metadata?: Record<string, string>;
  headers_to_split_on: [string, string][];
}

export interface Preset {
  config_overrides: PresetConfigOverrides;
  description: string;
  metadata_options?: Record<string, string[]>;
  name: string;
}

export type PresetsResponse = Record<string, Preset>;

export type PartStatus =
  | "waiting"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface PartResponse {
  error?: string;
  page_end: number;
  page_start: number;
  part_index: number;
  processing_time?: number;
  status: PartStatus;
}

export interface ParseTaskResponse {
  completed_parts?: number;
  created_at?: string;
  error?: string;
  file_size?: number;
  filename?: string;
  items?: PartResponse[];
  output_format?: string;
  page_count?: number;
  processing_time?: number;
  status: TaskStatus;
  task_id: string;
  task_type: "parsing";
  total_parts?: number;
}

export interface UploadResponse {
  file_id: string;
  filename: string;
  page_count: number | null;
  size: number;
}

export interface ChunkConfig {
  chunk_overlap: number;
  chunk_size: number;
  custom_metadata?: Record<string, string>;
  headers_to_split_on: [string, string][];
  min_characters_per_chunk: number;
  strip_headers: boolean;
}

export interface ChunkItem {
  chunk_id: string;
  metadata: {
    chunk_index: number;
    token_count: number;
    char_count: number;
    source_file: string;
    breadcrumb: string;
    [key: string]: unknown;
  };
}

export interface ChunkTaskResponse {
  config?: ChunkConfig;
  created_at?: string;
  error?: string;
  file_size?: number;
  filename?: string;
  items?: ChunkItem[];
  processing_time?: number;
  status: TaskStatus;
  task_id: string;
  task_type: "chunking";
  total_chunks?: number;
}

export interface EmbedItem {
  chunk_id: string;
  metadata: {
    chunk_index: number;
    [key: string]: unknown;
  };
}

export interface EmbedTaskResponse {
  completed_vectors?: number;
  created_at?: string;
  embedding_dim?: number;
  error?: string;
  file_size?: number;
  filename?: string;
  items?: EmbedItem[];
  model_name?: string;
  processing_time?: number;
  status: TaskStatus;
  task_id: string;
  task_type: "embedding";
  total_vectors?: number;
}

export type CombinedTask =
  | ParseTaskResponse
  | ChunkTaskResponse
  | EmbedTaskResponse;

const BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8000/api/v1"
    : "/api/v1";

const UPLOADS_API = `${BASE_URL}/uploads`;

export const api = {
  /**
   * Fetches the entire history of parsed documents (and pending/processing ones).
   */
  async getParseTasks(): Promise<ParseTaskResponse[]> {
    const res = await fetch(`${BASE_URL}/parse-tasks`);
    if (!res.ok) {
      throw new Error(`Failed to fetch tasks: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Pre-uploads a document to extract metadata.
   */
  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("data", file);

    const res = await fetch(UPLOADS_API, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Failed to upload file: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Deletes a pre-uploaded document.
   */
  async deleteUpload(fileId: string): Promise<void> {
    const res = await fetch(`${UPLOADS_API}/${fileId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete upload: ${res.statusText}`);
    }
  },

  async getPresets(): Promise<PresetsResponse> {
    const res = await fetch(`${BASE_URL}/chunk-presets`);
    if (!res.ok) {
      throw new Error(`Failed to fetch presets: ${res.statusText}`);
    }
    const data = await res.json();

    const record: PresetsResponse = {};
    if (data.presets && Array.isArray(data.presets)) {
      for (const p of data.presets) {
        record[p.id] = p;
      }
    }
    return record;
  },

  async submitTask(
    fileId: string,
    filename: string,
    action: "parse" | "chunk" | "embed" = "parse",
    formatOrPreset?: string,
    customMetadata?: Record<string, string>,
    presetData?: Preset,
    embedModel?: string
  ): Promise<{ task_id: string; status: string; message: string }> {
    let endpoint = `${BASE_URL}/parse-tasks`;
    if (action === "chunk") {
      endpoint = `${BASE_URL}/chunk-tasks`;
    }
    if (action === "embed") {
      endpoint = `${BASE_URL}/embed-tasks`;
    }

    let body: Record<string, unknown>;
    if (action === "chunk") {
      if (!presetData) {
        throw new Error("Preset data is required for chunking");
      }
      body = {
        file_id: fileId,
        filename,
        config: {
          chunk_size: presetData.config_overrides.chunk_size,
          chunk_overlap: presetData.config_overrides.chunk_overlap,
          headers_to_split_on: presetData.config_overrides.headers_to_split_on,
          custom_metadata:
            customMetadata || presetData.config_overrides.custom_metadata || {},
        },
      };
    } else if (action === "embed") {
      body = {
        file_id: fileId,
        filename,
        config: embedModel ? { model_name: embedModel } : undefined,
      };
    } else {
      body = {
        file_id: fileId,
        filename,
        output_format: formatOrPreset || "markdown",
      };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Failed to submit task: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Gets details for a specific task (including large content payload).
   */
  async getParseTaskResult(taskId: string): Promise<ParseTaskResponse> {
    const res = await fetch(`${BASE_URL}/parse-tasks/${taskId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch task result: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Deletes a task result.
   */
  async deleteParseTask(taskId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/parse-tasks/${taskId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete task: ${res.statusText}`);
    }
  },

  /**
   * Cancels an ongoing task.
   */
  async cancelParseTask(
    taskId: string
  ): Promise<{ task_id: string; status: string; message: string }> {
    const res = await fetch(`${BASE_URL}/parse-tasks/${taskId}/cancel`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Failed to cancel task: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Retries a failed part of a task.
   */
  async retryPart(
    taskId: string,
    partIndex: number
  ): Promise<{ task_id: string; status: string; message: string }> {
    const res = await fetch(
      `${BASE_URL}/parse-tasks/${taskId}/parts/${partIndex}/retry`,
      {
        method: "POST",
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to retry part: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Downloads the parsed markdown content for a specific part.
   */
  async downloadPartContent(taskId: string, partIndex: number): Promise<Blob> {
    const res = await fetch(
      `${BASE_URL}/parse-tasks/${taskId}/parts/${partIndex}/download`
    );
    if (!res.ok) {
      throw new Error(`Failed to download part: ${res.statusText}`);
    }
    return res.blob();
  },

  /**
   * Downloads the merged markdown content for the entire task.
   */
  async downloadParseFullContent(taskId: string): Promise<Blob> {
    const res = await fetch(`${BASE_URL}/parse-tasks/${taskId}/download`);
    if (!res.ok) {
      throw new Error(`Failed to download full content: ${res.statusText}`);
    }
    return res.blob();
  },

  // --- Chunking Endpoints ---

  async getChunkTasks(): Promise<ChunkTaskResponse[]> {
    const res = await fetch(`${BASE_URL}/chunk-tasks`);
    if (!res.ok) {
      throw new Error(`Failed to fetch chunk tasks: ${res.statusText}`);
    }
    return res.json();
  },

  async getChunkTaskResult(taskId: string): Promise<ChunkTaskResponse> {
    const res = await fetch(`${BASE_URL}/chunk-tasks/${taskId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch chunk task result: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteChunkTask(taskId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/chunk-tasks/${taskId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete chunk task: ${res.statusText}`);
    }
  },

  async cancelChunkTask(
    taskId: string
  ): Promise<{ task_id: string; status: string; message: string }> {
    const res = await fetch(`${BASE_URL}/chunk-tasks/${taskId}/cancel`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Failed to cancel chunk task: ${res.statusText}`);
    }
    return res.json();
  },

  async downloadChunks(taskId: string): Promise<Blob> {
    const res = await fetch(`${BASE_URL}/chunk-tasks/${taskId}/download`);
    if (!res.ok) {
      throw new Error(`Failed to download chunks: ${res.statusText}`);
    }
    return res.blob();
  },

  // --- Embedding Endpoints ---

  async getEmbedTasks(): Promise<EmbedTaskResponse[]> {
    const res = await fetch(`${BASE_URL}/embed-tasks`);
    if (!res.ok) {
      throw new Error(`Failed to fetch embed tasks: ${res.statusText}`);
    }
    return res.json();
  },

  async getEmbedTaskResult(taskId: string): Promise<EmbedTaskResponse> {
    const res = await fetch(`${BASE_URL}/embed-tasks/${taskId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch embed task result: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteEmbedTask(taskId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/embed-tasks/${taskId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete embed task: ${res.statusText}`);
    }
  },

  async cancelEmbedTask(
    taskId: string
  ): Promise<{ task_id: string; status: string; message: string }> {
    const res = await fetch(`${BASE_URL}/embed-tasks/${taskId}/cancel`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Failed to cancel embed task: ${res.statusText}`);
    }
    return res.json();
  },

  async downloadEmbeddings(taskId: string): Promise<Blob> {
    const res = await fetch(`${BASE_URL}/embed-tasks/${taskId}/download`);
    if (!res.ok) {
      throw new Error(`Failed to download embeddings: ${res.statusText}`);
    }
    return res.blob();
  },

  async getEmbedModels(): Promise<{ id: string; name: string }[]> {
    const res = await fetch(`${BASE_URL}/embed-models`);
    if (!res.ok) {
      throw new Error(`Failed to fetch embed models: ${res.statusText}`);
    }
    return res.json();
  },
};
