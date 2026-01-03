/**
 * Task Status API - Poll for async task results
 * GET /api/task-status?taskId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { taskQueue } from "@/lib/queue";

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json(
      { success: false, message: "taskId required" },
      { status: 400 }
    );
  }

  const result = taskQueue.getResult(taskId);

  if (!result) {
    return NextResponse.json(
      { success: false, message: "Task not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    taskId,
    ...result,
  });
}

// Get queue stats
export async function POST(req: NextRequest) {
  const stats = taskQueue.getStats();
  return NextResponse.json({ success: true, stats });
}
