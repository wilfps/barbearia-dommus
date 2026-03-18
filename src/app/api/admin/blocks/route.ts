import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { createBlockedSlot } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);
  const formData = await request.formData();
  const barberId = String(formData.get("barberId") || "");
  const startsAt = String(formData.get("startsAt") || "");
  const endsAt = String(formData.get("endsAt") || "");
  const reason = String(formData.get("reason") || "");

  if (!barberId || !startsAt || !endsAt) {
    redirect("/admin");
  }

  createBlockedSlot({ barberId, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), reason });
  redirect("/admin");
}
