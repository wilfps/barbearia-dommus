import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { deleteBlockedSlotById } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);

  const formData = await request.formData();
  const blockId = String(formData.get("blockId") || "");
  const rawDate = String(formData.get("date") || "");

  if (blockId) {
    deleteBlockedSlotById(blockId);
  }

  redirect(rawDate ? `/admin/fechar-dia?date=${rawDate}` : "/admin/fechar-dia");
}
