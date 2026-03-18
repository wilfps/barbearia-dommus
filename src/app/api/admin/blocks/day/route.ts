import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { createBlockedSlot, getPrimaryBarber } from "@/lib/db";
import { getBrazilDayRange } from "@/lib/brazil-time";

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
  const reason = String(formData.get("reason") || "Dia fechado pelo barbeiro");

  if (!barber?.id || !date) {
    redirect("/admin/fechar-dia");
  }

  const { startIso, endIso } = getBrazilDayRange(date);

  createBlockedSlot({
    barberId: barber.id,
    startsAt: startIso,
    endsAt: endIso,
    reason,
  });

  redirect(`/admin/fechar-dia?date=${rawDate}`);
}
