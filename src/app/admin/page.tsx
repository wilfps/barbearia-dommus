import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminAppointmentsList } from "@/components/admin-appointments-list";
import { AdminCustomerSearch } from "@/components/admin-customer-search";
import { AdminDateNavigation } from "@/components/admin-date-navigation";
import { AppShell } from "@/components/shell";
import { requireRoles } from "@/lib/auth";
import { formatBrazilDateInput } from "@/lib/brazil-time";
import { getPrimaryBarber, listAppointmentsForAdmin, listBirthdayCustomersOnDate, listCustomers } from "@/lib/db";
import { buildWhatsAppLink, formatMoney } from "@/lib/format";
import { buildBirthdayMessage, getWhatsAppIntegrationConfig } from "@/lib/integrations/whatsapp";

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
  return toIsoDate(value) ?? format(new Date(), "yyyy-MM-dd");
}

function isSameLocalDay(isoDate: string, selectedDate: string) {
  return formatBrazilDateInput(isoDate) === selectedDate;
}

function getSelectedDateLabel(selectedDate: string) {
  const date = new Date(`${selectedDate}T12:00:00`);
  const day = format(date, "dd/MM/yyyy");
  const weekDay = format(date, "EEEE", { locale: ptBR }).toUpperCase();
  return `${day} - ${weekDay}`;
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);
  const params = await searchParams;
  const selectedDate = normalizeDateInput(params.date);
  const selectedDateLabel = getSelectedDateLabel(selectedDate);
  const primaryBarber = getPrimaryBarber();
  const birthdayCustomers = listBirthdayCustomersOnDate(selectedDate);
  const whatsappConfig = getWhatsAppIntegrationConfig();
  const customerResults = listCustomers();

  const allPaidAppointments = listAppointmentsForAdmin(primaryBarber ? [primaryBarber.id] : undefined)
    .filter((appointment) => appointment.status === "CONFIRMED" && appointment.deposit_status === "PAID");

  const appointments = allPaidAppointments
    .filter((appointment) => appointment.status === "CONFIRMED" && appointment.deposit_status === "PAID")
    .filter((appointment) => isSameLocalDay(appointment.scheduled_at, selectedDate))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const totalClientsToday = appointments.length;
  const totalReceivedToday = appointments.reduce(
    (sum, item) => sum + (item.paid_amount_in_cents || item.deposit_in_cents),
    0,
  );
  const selectedMonth = format(new Date(`${selectedDate}T12:00:00`), "yyyy-MM");
  const totalReceivedMonth = allPaidAppointments
    .filter((appointment) => formatBrazilDateInput(appointment.scheduled_at).slice(0, 7) === selectedMonth)
    .reduce((sum, item) => sum + (item.paid_amount_in_cents || item.deposit_in_cents), 0);

  return (
    <AppShell
      title="Área do barbeiro"
      subtitle="Agenda limpa de Gabriel Rodrigues, mostrando apenas clientes confirmados com pagamento já feito."
      myAreaHref="/admin"
      hideAdminLinks
      secondaryNav={
        <>
          <Link
            href="/admin/agendamento-manual"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-center font-medium text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-amber-300/50 hover:bg-amber-300/10 sm:px-4 sm:py-2"
          >
            Agendamento manual
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
        <section className="glass flex flex-col gap-4 rounded-[24px] p-4 sm:rounded-[30px] sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Agenda do dia</p>
            <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Clientes confirmados</h2>
            <p className="mt-2 text-sm text-stone-300">Gabriel Rodrigues - {selectedDateLabel}</p>
          </div>
          <AdminDateNavigation selectedDate={selectedDate} />
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
              Gabriel Rodrigues - {formatMoney(totalReceivedToday)}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[28px] sm:p-5">
            <p className="text-sm text-stone-400">Ganhos do mês</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">{formatMoney(totalReceivedMonth)}</p>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-stone-200">
              Gabriel Rodrigues - {formatMoney(totalReceivedMonth)}
            </div>
          </div>
        </div>

        <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-5">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Agenda</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Clientes pagos do dia</h2>
          <AdminAppointmentsList initialAppointments={appointments} />
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


