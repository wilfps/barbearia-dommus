import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminAppointmentsList } from "@/components/admin-appointments-list";
import { AdminCustomerSearch } from "@/components/admin-customer-search";
import { AdminDateNavigation } from "@/components/admin-date-navigation";
import { AppShell } from "@/components/shell";
import { requireRoles } from "@/lib/auth";
import { formatBrazilDateInput, formatBrazilTime, getBrazilDayRange, toBrazilDateObject } from "@/lib/brazil-time";
import {
  ensureDefaultBlockedPeriodsForDate,
  getPrimaryBarber,
  listAppointmentsForAdmin,
  listBirthdayCustomersOnDate,
  listBlockedSlotsByBarberOnDate,
  listCustomers,
} from "@/lib/db";
import { buildWhatsAppLink, formatMoney } from "@/lib/format";
import { buildBirthdayMessage, getWhatsAppIntegrationConfig } from "@/lib/integrations/whatsapp";
import { normalizeWorkingDate } from "@/lib/quick-dates";

type SearchParams = Promise<{ date?: string }>;

type CustomerInsight = {
  id: string;
  name: string;
  phone: string;
  email: string;
  visitsCount: number;
  lastVisitLabel?: string | null;
  lastServiceName?: string | null;
};

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

function isSameLocalDay(isoDate: string, selectedDate: string) {
  return formatBrazilDateInput(isoDate) === selectedDate;
}

function getSelectedDateLabel(selectedDate: string) {
  const date = new Date(`${selectedDate}T12:00:00`);
  const day = format(date, "dd/MM/yyyy");
  const weekDay = format(date, "EEEE", { locale: ptBR }).toLowerCase();
  return `${day} - ${weekDay}`;
}

function getMonthSummary(selectedDate: string) {
  const date = new Date(`${selectedDate}T12:00:00`);
  const monthName = format(date, "LLLL", { locale: ptBR }).toLowerCase();
  const lastDay = Number(format(new Date(date.getFullYear(), date.getMonth() + 1, 0), "d"));
  return {
    selectedMonth: format(date, "yyyy-MM"),
    monthName,
    rangeLabel: `dia 1 - ${lastDay}`,
  };
}

function toSlotTimeOptions(selectedDate: string) {
  const slots: string[] = [];
  let hour = 9;
  let minute = 0;

  while (hour < 20 || (hour === 20 && minute === 0)) {
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    minute += 30;
    if (minute === 60) {
      minute = 0;
      hour += 1;
    }
  }

  const todayBrazil = formatBrazilDateInput(new Date());
  const now = new Date();

  return slots.filter((time) => {
    if (selectedDate !== todayBrazil) return true;
    return toBrazilDateObject(selectedDate, `${time}:00`) >= now;
  });
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);
  const params = await searchParams;
  const selectedDate = normalizeDateInput(params.date);
  const selectedDateLabel = getSelectedDateLabel(selectedDate);
  const monthSummary = getMonthSummary(selectedDate);
  const primaryBarber = getPrimaryBarber();

  if (primaryBarber?.id) {
    ensureDefaultBlockedPeriodsForDate(primaryBarber.id, selectedDate);
  }

  const birthdayCustomers = listBirthdayCustomersOnDate(selectedDate);
  const whatsappConfig = getWhatsAppIntegrationConfig();
  const allAppointments = listAppointmentsForAdmin(primaryBarber ? [primaryBarber.id] : undefined)
    .filter((appointment) => appointment.status !== "CANCELED")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const selectedDayAppointments = allAppointments.filter((appointment) => isSameLocalDay(appointment.scheduled_at, selectedDate));
  const paidAppointments = selectedDayAppointments.filter((appointment) => appointment.deposit_status === "PAID");
  const pendingAppointments = selectedDayAppointments.filter((appointment) => appointment.deposit_status !== "PAID");

  const totalClientsToday = selectedDayAppointments.length;
  const totalReceivedToday = paidAppointments.reduce(
    (sum, item) => sum + (item.paid_amount_in_cents || item.deposit_in_cents),
    0,
  );
  const projectedToday = selectedDayAppointments.reduce(
    (sum, item) => sum + (item.total_price_in_cents || item.checkout_amount_in_cents || item.deposit_in_cents),
    0,
  );
  const totalPendingToday = pendingAppointments.reduce(
    (sum, item) => sum + (item.total_price_in_cents || item.checkout_amount_in_cents || item.deposit_in_cents),
    0,
  );
  const totalReceivedMonth = allAppointments
    .filter((appointment) => appointment.deposit_status === "PAID")
    .filter((appointment) => formatBrazilDateInput(appointment.scheduled_at).slice(0, 7) === monthSummary.selectedMonth)
    .reduce((sum, item) => sum + (item.paid_amount_in_cents || item.deposit_in_cents), 0);

  const nextAppointment = selectedDayAppointments.find((appointment) => toBrazilDateObject(selectedDate, `${formatBrazilTime(appointment.scheduled_at)}:00`) >= new Date()) ?? selectedDayAppointments[0] ?? null;

  const blockedSlots = primaryBarber?.id
    ? listBlockedSlotsByBarberOnDate(primaryBarber.id, getBrazilDayRange(selectedDate).startIso, getBrazilDayRange(selectedDate).endIso)
    : [];

  const nextFreeSlot = toSlotTimeOptions(selectedDate).find((time) => {
    const slotStart = toBrazilDateObject(selectedDate, `${time}:00`);
    const occupied = selectedDayAppointments.some((appointment) => {
      const start = new Date(appointment.scheduled_at);
      const end = new Date(appointment.end_at);
      return slotStart >= start && slotStart < end;
    });
    const blocked = blockedSlots.some((slot) => {
      const start = new Date(slot.starts_at);
      const end = new Date(slot.ends_at);
      return slotStart >= start && slotStart <= end;
    });
    return !occupied && !blocked;
  }) ?? null;

  const customerResults: CustomerInsight[] = listCustomers().map((customer) => {
    const customerAppointments = allAppointments.filter((appointment) => appointment.customer_id === customer.id);
    const lastAppointment = [...customerAppointments].sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      visitsCount: customerAppointments.length,
      lastVisitLabel: lastAppointment ? `${formatBrazilDateInput(lastAppointment.scheduled_at).split("-").reverse().join("/")} às ${formatBrazilTime(lastAppointment.scheduled_at)}` : null,
      lastServiceName: lastAppointment?.service_name ?? null,
    };
  });

  return (
    <AppShell
      title="Área do barbeiro"
      subtitle="Painel operacional de Gabriel Rodrigues para tocar agenda, encaixes e faturamento com rapidez."
      myAreaHref="/admin"
      hideAdminLinks
      secondaryNav={
        <>
          <Link
            href="/admin/agendamento-manual"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-center font-medium text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-amber-300/50 hover:bg-amber-300/10 sm:px-4 sm:py-2"
          >
            Agendar cliente agora
          </Link>
          <Link
            href={`/admin/agenda?date=${selectedDate}`}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-center font-medium text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-amber-300/50 hover:bg-amber-300/10 sm:px-4 sm:py-2"
          >
            Ver agenda completa
          </Link>
          <Link
            href="/admin/fechar-dia"
            className="rounded-full border border-amber-300/40 bg-amber-300/12 px-4 py-3 text-center font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(210,178,124,0.08)] transition hover:border-amber-300/60 hover:bg-amber-300/18 sm:px-4 sm:py-2"
          >
            Fechar dia ou horário
          </Link>
        </>
      }
    >
      <div className="grid gap-5 sm:gap-6">
        <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Painel operacional</p>
              <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Visão rápida do dia</h2>
              <p className="mt-2 text-sm text-stone-300">{selectedDateLabel}</p>
            </div>
            <AdminDateNavigation selectedDate={selectedDate} />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-200/60">Próximo cliente</p>
              <p className="mt-3 text-lg font-semibold text-amber-50">{nextAppointment?.customer_name ?? "Agenda livre"}</p>
              <p className="mt-2 text-sm text-stone-300">
                {nextAppointment ? `${formatBrazilTime(nextAppointment.scheduled_at)} - ${nextAppointment.service_name}` : "Sem atendimento pendente na seleção atual."}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-200/60">Próximo horário livre</p>
              <p className="mt-3 text-3xl font-semibold text-amber-50">{nextFreeSlot ?? "--:--"}</p>
              <p className="mt-2 text-sm text-stone-300">O primeiro encaixe disponível no dia selecionado.</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-200/60">Atendimentos restantes</p>
              <p className="mt-3 text-3xl font-semibold text-amber-50">{selectedDayAppointments.length}</p>
              <p className="mt-2 text-sm text-stone-300">Somando reservas manuais, pagas e pendentes.</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-200/60">Previsão do dia</p>
              <p className="mt-3 text-3xl font-semibold text-amber-50">{formatMoney(projectedToday)}</p>
              <p className="mt-2 text-sm text-stone-300">Recebido: {formatMoney(totalReceivedToday)}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[28px] sm:p-5">
            <p className="text-sm text-stone-400">Clientes do dia</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">{totalClientsToday}</p>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-stone-200">
              Gabriel Rodrigues - {totalClientsToday} cliente(s)
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[28px] sm:p-5">
            <p className="text-sm text-stone-400">Ganhos de hoje</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">{formatMoney(totalReceivedToday)}</p>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-stone-200">
              Recebido agora - {formatMoney(totalReceivedToday)}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[28px] sm:p-5">
            <p className="text-sm text-stone-400">Ganhos de {monthSummary.monthName}</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">{formatMoney(totalReceivedMonth)}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-amber-200/60">{monthSummary.rangeLabel}</p>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-stone-200">
              Gabriel Rodrigues - {formatMoney(totalReceivedMonth)}
            </div>
            <Link
              href={`/admin/ganhos?date=${selectedDate}`}
              className="mt-4 inline-flex rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/16"
            >
              Ver lista de ganhos
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-black/15 p-4">
            <p className="text-sm text-stone-400">Pendentes de pagamento</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">{pendingAppointments.length}</p>
            <p className="mt-2 text-sm text-stone-300">Total em aberto: {formatMoney(totalPendingToday)}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/15 p-4">
            <p className="text-sm text-stone-400">Recebido x previsto</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">
              {projectedToday > 0 ? `${Math.round((totalReceivedToday / projectedToday) * 100)}%` : "0%"}
            </p>
            <p className="mt-2 text-sm text-stone-300">Quanto do dia já está convertido em caixa.</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/15 p-4">
            <p className="text-sm text-stone-400">Operação manual</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">
              {selectedDayAppointments.filter((appointment) => appointment.manual_customer_name || appointment.manual_customer_phone).length}
            </p>
            <p className="mt-2 text-sm text-stone-300">Reservas de balcão registradas para o dia selecionado.</p>
          </div>
        </div>

        <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-5">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Agenda</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Agenda viva do dia</h2>
          <AdminAppointmentsList initialAppointments={selectedDayAppointments} />
        </section>

        <AdminCustomerSearch customers={customerResults} />

        <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-5">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Aniversariantes</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Parabéns do dia</h2>
          <p className="mt-2 text-sm text-stone-300">
            WhatsApp configurado: {whatsappConfig.tokenConfigured && whatsappConfig.phoneIdConfigured ? "pronto para integrar envio real" : "modo link direto por enquanto"}.
          </p>
          <div className="mt-5 space-y-3">
            {birthdayCustomers.length ? (
              birthdayCustomers.map((customer) => {
                const whatsappMessage = buildBirthdayMessage(customer.name);
                return (
                  <div key={customer.id} className="rounded-[22px] border border-white/10 bg-black/15 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-lg text-amber-50">{customer.name}</p>
                        <p className="mt-1 text-sm text-stone-300">{customer.phone}</p>
                      </div>
                      <Link
                        href={buildWhatsAppLink(customer.phone, whatsappMessage)}
                        target="_blank"
                        className="rounded-[18px] border border-emerald-400/35 bg-emerald-400/10 px-4 py-3 text-center font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
                      >
                        Enviar parabéns no WhatsApp
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 p-4 text-sm text-stone-400">
                Nenhum aniversariante encontrado nessa data.
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

