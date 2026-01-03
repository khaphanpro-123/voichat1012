/**
 * useAsyncTask - Hook for handling async tasks with polling
 * Supports optimistic UI updates
 */

import { useState, useCallback, useRef, useEffect } from "react";

export type TaskStatus = "idle" | "pending" | "processing" | "completed" | "failed";

interface TaskResult<T> {
  status: TaskStatus;
  result?: T;
  error?: string;
}

interface UseAsyncTaskOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: string) => void;
  pollInterval?: number; // ms, default 500
  maxPollAttempts?: number; // default 60 (30 seconds)
}

export function useAsyncTask<T = any>(options: UseAsyncTaskOptions<T> = {}) {
  const { onSuccess, onError, pollInterval = 500, maxPollAttempts = 60 } = options;
  
  const [status, setStatus] = useState<TaskStatus>("idle");
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  
  const pollCountRef = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll for task status
  const pollTaskStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/task-status?taskId=${id}`);
      const data: TaskResult<T> = await res.json();

      if (data.status === "completed") {
        setStatus("completed");
        setResult(data.result || null);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        onSuccess?.(data.result as T);
      } else if (data.status === "failed") {
        setStatus("failed");
        setError(data.error || "Task failed");
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        onError?.(data.error || "Task failed");
      } else {
        setStatus(data.status as TaskStatus);
      }

      pollCountRef.current++;
      if (pollCountRef.current >= maxPollAttempts) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setStatus("failed");
        setError("Task timeout");
        onError?.("Task timeout");
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, [maxPollAttempts, onSuccess, onError]);

  // Start polling for a task
  const startPolling = useCallback((id: string) => {
    setTaskId(id);
    setStatus("pending");
    pollCountRef.current = 0;
    
    // Initial poll
    pollTaskStatus(id);
    
    // Start interval polling
    pollIntervalRef.current = setInterval(() => {
      pollTaskStatus(id);
    }, pollInterval);
  }, [pollInterval, pollTaskStatus]);

  // Execute an async API call
  const execute = useCallback(async (
    apiCall: () => Promise<Response>,
    optimisticResult?: T
  ): Promise<{ taskId?: string; immediate?: T }> => {
    setStatus("pending");
    setError(null);
    
    // Set optimistic result immediately
    if (optimisticResult) {
      setResult(optimisticResult);
    }

    try {
      const res = await apiCall();
      const data = await res.json();

      // Check if API returned 202 (async task)
      if (res.status === 202 && data.taskId) {
        startPolling(data.taskId);
        return { taskId: data.taskId };
      }

      // Immediate result
      if (data.success) {
        setStatus("completed");
        setResult(data);
        onSuccess?.(data);
        return { immediate: data };
      } else {
        setStatus("failed");
        setError(data.message || "Request failed");
        onError?.(data.message || "Request failed");
        return {};
      }
    } catch (err: any) {
      setStatus("failed");
      setError(err.message || "Network error");
      onError?.(err.message || "Network error");
      return {};
    }
  }, [startPolling, onSuccess, onError]);

  // Reset state
  const reset = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStatus("idle");
    setResult(null);
    setError(null);
    setTaskId(null);
    pollCountRef.current = 0;
  }, []);

  return {
    status,
    result,
    error,
    taskId,
    isLoading: status === "pending" || status === "processing",
    isSuccess: status === "completed",
    isError: status === "failed",
    execute,
    startPolling,
    reset,
  };
}

/**
 * Fire-and-forget helper - doesn't wait for response
 */
export function fireAndForget(url: string, data: any): void {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(console.error);
}

/**
 * Track progress helper - fire-and-forget
 */
export function trackProgress(userId: string, activity: string, mistake?: any): void {
  if (!userId || userId === "anonymous") return;
  
  fireAndForget("/api/user-progress", { userId, activity });
  
  if (mistake) {
    fetch("/api/user-progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mistake }),
    }).catch(console.error);
  }
}
