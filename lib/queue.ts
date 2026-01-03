/**
 * In-Memory Task Queue System
 * Lightweight async job processing without Redis/external dependencies
 * For production, consider BullMQ with Redis
 */

export type TaskStatus = "pending" | "processing" | "completed" | "failed";

export interface Task<T = any> {
  id: string;
  type: string;
  data: T;
  status: TaskStatus;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retries: number;
  maxRetries: number;
}

type TaskHandler<T = any> = (data: T) => Promise<any>;

class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private handlers: Map<string, TaskHandler> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 5;
  private isRunning: boolean = false;

  constructor() {
    // Auto-start processing
    this.startProcessing();
  }

  // Generate unique task ID
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Register a handler for a task type
  registerHandler<T>(type: string, handler: TaskHandler<T>): void {
    this.handlers.set(type, handler);
  }

  // Enqueue a new task - returns immediately
  enqueue<T>(type: string, data: T, maxRetries: number = 3): string {
    const id = this.generateId();
    const task: Task<T> = {
      id,
      type,
      data,
      status: "pending",
      createdAt: new Date(),
      retries: 0,
      maxRetries,
    };
    this.tasks.set(id, task);
    
    // Trigger processing (non-blocking)
    setImmediate(() => this.processNext());
    
    return id;
  }

  // Fire-and-forget: enqueue without tracking
  fireAndForget<T>(type: string, data: T): void {
    const handler = this.handlers.get(type);
    if (handler) {
      // Execute immediately in background, don't await
      setImmediate(async () => {
        try {
          await handler(data);
        } catch (err) {
          console.error(`[Queue] Fire-and-forget task ${type} failed:`, err);
        }
      });
    }
  }

  // Get task status
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  // Get task result (polling endpoint)
  getResult(id: string): { status: TaskStatus; result?: any; error?: string } | null {
    const task = this.tasks.get(id);
    if (!task) return null;
    return {
      status: task.status,
      result: task.result,
      error: task.error,
    };
  }

  // Start background processing
  private startProcessing(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processLoop();
  }

  // Main processing loop
  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      await this.processNext();
      // Small delay to prevent CPU spinning
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Process next pending task
  private async processNext(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent) return;

    // Find next pending task
    for (const [id, task] of this.tasks) {
      if (task.status === "pending" && !this.processing.has(id)) {
        this.processing.add(id);
        this.executeTask(task).finally(() => {
          this.processing.delete(id);
        });
        break;
      }
    }
  }

  // Execute a single task
  private async executeTask(task: Task): Promise<void> {
    const handler = this.handlers.get(task.type);
    if (!handler) {
      task.status = "failed";
      task.error = `No handler for task type: ${task.type}`;
      return;
    }

    task.status = "processing";
    task.startedAt = new Date();

    try {
      task.result = await handler(task.data);
      task.status = "completed";
      task.completedAt = new Date();
    } catch (err: any) {
      task.retries++;
      if (task.retries < task.maxRetries) {
        task.status = "pending"; // Retry
        console.log(`[Queue] Task ${task.id} failed, retrying (${task.retries}/${task.maxRetries})`);
      } else {
        task.status = "failed";
        task.error = err.message || "Unknown error";
        task.completedAt = new Date();
        console.error(`[Queue] Task ${task.id} failed permanently:`, err.message);
      }
    }

    // Cleanup old completed tasks (keep last 100)
    this.cleanup();
  }

  // Cleanup old tasks
  private cleanup(): void {
    const completed = Array.from(this.tasks.values())
      .filter(t => t.status === "completed" || t.status === "failed")
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));

    if (completed.length > 100) {
      completed.slice(100).forEach(t => this.tasks.delete(t.id));
    }
  }

  // Get queue stats
  getStats(): { pending: number; processing: number; completed: number; failed: number } {
    let pending = 0, processing = 0, completed = 0, failed = 0;
    for (const task of this.tasks.values()) {
      switch (task.status) {
        case "pending": pending++; break;
        case "processing": processing++; break;
        case "completed": completed++; break;
        case "failed": failed++; break;
      }
    }
    return { pending, processing, completed, failed };
  }
}

// Singleton instance
export const taskQueue = new TaskQueue();

// Task types
export const TASK_TYPES = {
  OCR_PROCESS: "ocr_process",
  GENERATE_FLASHCARD: "generate_flashcard",
  TRACK_PROGRESS: "track_progress",
  SAVE_DOCUMENT: "save_document",
  ANALYZE_TEXT: "analyze_text",
  SAVE_LEARNING_SESSION: "save_learning_session",
} as const;
