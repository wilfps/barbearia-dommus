import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { deleteBlockedSlotById, releaseBlockedSlotTimeById } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);

  const contentType = request.headers.get("content-type") || "";
  const expectsJson = request.headers.get("x-requested-with") === "XMLHttpRequest";

  let blockId = "";
  let rawDate = "";
  let time = "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { blockId?: string; date?: string; time?: string };
    blockId = String(body.blockId || "");
    rawDate = String(body.date || "");
    time = String(body.time || "");
  } else {
    const formData = await request.formData();
    blockId = String(formData.get("blockId") || "");
    rawDate = String(formData.get("date") || "");
    time = String(formData.get("time") || "");
  }

  if (blockId) {
    if (rawDate && time) {
      releaseBlockedSlotTimeById({ id: blockId, dateIso: rawDate, time });
    } else {
      deleteBlockedSlotById(blockId);
    }
  }

  if (expectsJson) {
    return Response.json({ success: true, removedId: blockId, date: rawDate, time });
  }

  redirect(rawDate ? `/admin/fechar-dia?date=${rawDate}` : "/admin/fechar-dia");
}
