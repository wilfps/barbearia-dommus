import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { deleteBlockedSlotById } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);

  const contentType = request.headers.get("content-type") || "";
  const expectsJson = request.headers.get("x-requested-with") === "XMLHttpRequest";

  let blockId = "";
  let rawDate = "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { blockId?: string; date?: string };
    blockId = String(body.blockId || "");
    rawDate = String(body.date || "");
  } else {
    const formData = await request.formData();
    blockId = String(formData.get("blockId") || "");
    rawDate = String(formData.get("date") || "");
  }

  if (blockId) {
    deleteBlockedSlotById(blockId);
  }

  if (expectsJson) {
    return Response.json({ success: true, removedId: blockId, date: rawDate });
  }

  redirect(rawDate ? `/admin/fechar-dia?date=${rawDate}` : "/admin/fechar-dia");
}
