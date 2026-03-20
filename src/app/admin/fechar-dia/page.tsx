import Link from "next/link";
import { format } from "date-fns";
import { AdminBlockForms } from "@/components/admin-block-forms";
import { AppShell } from "@/components/shell";
import { requireRoles } from "@/lib/auth";
import { ensureBlockedDay, ensureDefaultBlockedPeriodsForDate, getPrimaryBarber, listBlockedSlots } from "@/lib/db";
import { getQuickWeekDates } from "@/lib/quick-dates";

type SearchParams = Promise<{
  date?: string | string[];
}>;

function resolveDate(rawDate: string | string[] | undefined) {
  const selectedDate = Array.isArray(rawDate) ? rawDate[0] : rawDate;
  return selectedDate && /^\d{2}\/\d{2}\/\d{4}$/.test(selectedDate) ? selectedDate : format(new Date(), "dd/MM/yyyy");
}

export default async function FecharDiaPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);
  const params = await searchParams;
  const primaryBarber = getPrimaryBarber();
  const today = resolveDate(params.date);
  if (primaryBarber) {
    const [day, month, year] = today.split("/");
    if (day && month && year) {
      ensureDefaultBlockedPeriodsForDate(primaryBarber.id, `${year}-${month}-${day}`);
    }
    getQuickWeekDates(new Date())
      .filter((item) => item.rolledToNextWeek)
      .forEach((item) => {
        ensureBlockedDay(primaryBarber.id, item.iso, "Fechado por padrão até o barbeiro liberar");
        ensureDefaultBlockedPeriodsForDate(primaryBarber.id, item.iso);
      });
  }
  const upcomingBlockedSlots = primaryBarber
    ? listBlockedSlots([primaryBarber.id]).filter((slot) => new Date(slot.ends_at).getTime() >= new Date().setHours(0, 0, 0, 0))
    : [];

  return (
    <AppShell
      title="Fechar agenda"
      subtitle="Bloqueie o dia inteiro ou apenas um periodo especifico da agenda de Gabriel Rodrigues."
      myAreaHref="/admin"
      hideAdminLinks
      secondaryNav={
        <Link
          href="/admin"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-amber-300/50 hover:bg-amber-300/10 sm:px-4 sm:py-2"
        >
          Voltar para agenda
        </Link>
      }
    >
      <AdminBlockForms
        barberName={primaryBarber?.name ?? "Gabriel Rodrigues"}
        initialDate={today}
        blockedSlots={upcomingBlockedSlots}
      />
    </AppShell>
  );
}
