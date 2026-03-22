import Link from "next/link";
import { addMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminDailyAgendaView } from "@/components/admin-daily-agenda-view";
import { AdminDateNavigation } from "@/components/admin-date-navigation";
import { AppShell } from "@/components/shell";
import { requireRoles } from "@/lib/auth";
import { formatBrazilDateInput, formatBrazilTime } from "@/lib/brazil-time";
import { ensureDefaultBlockedPeriodsForDate, getPrimaryBarber, listAppointmentsForAdmin, listBlockedSlots } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { normalizeWorkingDate } from "@/lib/quick-dates";

type SearchParams = Promise<{ date?: string }>;

function toIsoDate(value?: string) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function normalizeDateInput(value?: string) {
  const resolved = toIsoDate(value) ?? format(new Date(), "yyyy-MM-dd");
  return format(normalizeWorkingDate(resolved), "yyyy-MM-dd");
}

function getSelectedDateLabel(selectedDate: string) {
  const date = new Date(`${selectedDate}T12:00:00`);
  const day = format(date, "dd/MM/yyyy");
  const weekDay = format(date, "EEEE", { locale: ptBR }).toLowerCase();
  return `${day} - ${weekDay}`;
}

export default async function AdminAgendaPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);
  const params = await searchParams;
  const selectedDate = normalizeDateInput(params.date);
  const selectedDateLabel = getSelectedDateLabel(selectedDate);
  const primaryBarber = getPrimaryBarber();

  if (primaryBarber?.id) {
    ensureDefaultBlockedPeriodsForDate(primaryBarber.id, selectedDate);
  }

  const allAppointments = listAppointmentsForAdmin(primaryBarber ? [primaryBarber.id] : undefined)
    .filter((appointment) => appointment.status !== "CANCELED")
    .filter((appointment) => formatBrazilDateInput(appointment.scheduled_at) === selectedDate)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const allBlockedSlots = listBlockedSlots(primaryBarber ? [primaryBarber.id] : undefined).filter(
    (slot) => formatBrazilDateInput(slot.starts_at) === selectedDate,
  );

  const slotTimes: string[] = [];
  let cursor = setMinutes(setHours(startOfDay(new Date()), 9), 0);
  const finish = setMinutes(setHours(startOfDay(new Date()), 20), 0);
  while (cursor <= finish) {
    slotTimes.push(format(cursor, "HH:mm"));
    cursor = addMinutes(cursor, 30);
  }

  const slots = slotTimes.map((time) => {
    const appointment = allAppointments.find((item) => formatBrazilTime(item.scheduled_at) === time);
    const matchedBlockedSlot = allBlockedSlots.find((item) => {
      const start = formatBrazilTime(item.starts_at);
      const end = formatBrazilTime(item.ends_at);
      if (start === "00:00" && end === "23:59") return false;
      return time >= start && time <= end;
    });

    return {
      time,
      blocked: Boolean(matchedBlockedSlot),
      blockedSlotId: matchedBlockedSlot?.id,
      appointment: appointment
        ? {
            id: appointment.id,
            customerName: appointment.customer_name ?? "Cliente",
            serviceName: appointment.service_name ?? "Serviço",
            scheduledAt: appointment.scheduled_at,
            customerPhone: appointment.customer_phone ?? undefined,
            amountLabel: formatMoney(appointment.paid_amount_in_cents || appointment.deposit_in_cents),
            paidLabel:
              appointment.manual_customer_name
                ? "Agendamento manual"
                : appointment.payment_scope === "FULL"
                  ? "Pagamento total"
                  : appointment.deposit_status === "PAID"
                    ? "Pagamento confirmado"
                    : "Pagamento pendente",
          }
        : undefined,
    };
  });

  const appointments = allAppointments.map((appointment) => ({
    id: appointment.id,
    customerName: appointment.customer_name ?? "Cliente",
    serviceName: appointment.service_name ?? "Serviço",
    scheduledAt: appointment.scheduled_at,
    customerPhone: appointment.customer_phone ?? undefined,
    amountLabel: formatMoney(appointment.paid_amount_in_cents || appointment.deposit_in_cents),
    paidLabel:
      appointment.manual_customer_name
        ? "Agendamento manual"
        : appointment.payment_scope === "FULL"
          ? "Pagamento total"
          : appointment.deposit_status === "PAID"
            ? "Pagamento confirmado"
            : "Pagamento pendente",
  }));

  return (
    <AppShell
      title="Agenda detalhada"
      subtitle={`Gabriel Rodrigues - ${selectedDateLabel}`}
      myAreaHref="/admin"
      hideAdminLinks
      secondaryNav={
        <Link
          href={`/admin?date=${selectedDate}`}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-center font-medium text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-amber-300/50 hover:bg-amber-300/10 sm:px-4 sm:py-2"
        >
          Voltar para o painel
        </Link>
      }
    >
      <div className="grid gap-6">
        <section className="glass flex flex-col gap-4 rounded-[24px] p-4 sm:rounded-[30px] sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Agenda detalhada</p>
            <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Clientes e horários do dia</h2>
            <p className="mt-2 text-sm text-stone-300">Gabriel Rodrigues - {selectedDateLabel}</p>
          </div>
          <AdminDateNavigation selectedDate={selectedDate} navigationBasePath="/admin/agenda" agendaHrefBase="/admin/agenda" />
        </section>

        <AdminDailyAgendaView appointments={appointments} slots={slots} selectedDate={selectedDate} />
      </div>
    </AppShell>
  );
}
