import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { createBlockedSlot, getPrimaryBarber } from "@/lib/db";
import { toBrazilDateObject } from "@/lib/brazil-time";

function parseBrazilianDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export async function POST(request: Request) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);

  const formData = await request.formData();
  const barber = getPrimaryBarber();
  const rawDate = String(formData.get("date") || "");
  const date = parseBrazilianDate(rawDate);
  const startTime = String(formData.get("startTime") || "");
  const endTime = String(formData.get("endTime") || "");
  const reason = String(formData.get("reason") || "Horário fechado pelo barbeiro");

  if (!barber?.id || !date || !startTime || !endTime) {
    redirect("/admin/fechar-dia");
  }

  const startsAt = toBrazilDateObject(date, startTime);
  const endsAt = toBrazilDateObject(date, endTime);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    redirect("/admin/fechar-dia");
  }

  createBlockedSlot({
    barberId: barber.id,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    reason,
  });

  redirect(`/admin/fechar-dia?date=${rawDate}`);
}
