export type TaskStatus =
  | "pending"
  | "processing"
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

const API_BASE = "/api/documents";

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
   * Submits a new document for parsing.
   */
  async submitTask(
    file: File,
    format = "markdown"
  ): Promise<{ task_id: string; status: string; message: string }> {
    const formData = new FormData();
    formData.append("data", file);

    const res = await fetch(`${API_BASE}/parse?output_format=${format}`, {
      method: "POST",
      body: formData,
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
};
