// app/api/cron/sync/route.ts
// Placeholder for cron sync functionality

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // TODO: Implement sync logic when RAG sync-all is available
    return Response.json({
      success: true,
      message: "Cron sync endpoint ready",
      data: { synced: 0 },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
