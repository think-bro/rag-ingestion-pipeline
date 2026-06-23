export type TaskStatus =
  | "pending"
  | "processing"
  | "cancelling"
  | "completed"
  | "failed"
  | "cancelled";

export interface TaskResultResponse {
  content?: string;
  created_at?: string;
  error?: string;
  filename?: string;
  output_format?: string;
  processing_time?: number;
  status: TaskStatus;
  task_id: string;
}

export interface UploadResponse {
  file_id: string;
  filename: string;
  page_count: number | null;
  size: number;
}

const API_BASE =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8000/api/v1/documents"
    : "/api/v1/documents";

export const api = {
  /**
   * Fetches the entire history of parsed documents (and pending/processing ones).
   */
  async getTasks(): Promise<TaskResultResponse[]> {
    const res = await fetch(`${API_BASE}/tasks`);
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

    const res = await fetch(`${API_BASE}/uploads`, {
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
    const res = await fetch(`${API_BASE}/uploads/${fileId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete upload: ${res.statusText}`);
    }
  },

  /**
   * Submits a pre-uploaded document for parsing.
   */
  async submitTask(
    fileId: string,
    filename: string,
    format = "markdown"
  ): Promise<{ task_id: string; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/parse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_id: fileId,
        filename,
        output_format: format,
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to submit task: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Gets details for a specific task (including large content payload).
   */
  async getTaskResult(taskId: string): Promise<TaskResultResponse> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch task result: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Deletes a task result.
   */
  async deleteTask(taskId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to delete task: ${res.statusText}`);
    }
  },

  /**
   * Cancels an ongoing task.
   */
  async cancelTask(
    taskId: string
  ): Promise<{ task_id: string; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/cancel`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Failed to cancel task: ${res.statusText}`);
    }
    return res.json();
  },
};
