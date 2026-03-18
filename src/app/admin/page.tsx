import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminDateNavigation } from "@/components/admin-date-navigation";
import { AppShell } from "@/components/shell";
import { requireRoles } from "@/lib/auth";
import { getPrimaryBarber, listAppointmentsForAdmin, listBirthdayCustomersOnDate } from "@/lib/db";
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
  return format(new Date(isoDate), "yyyy-MM-dd") === selectedDate;
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

  const appointments = listAppointmentsForAdmin(primaryBarber ? [primaryBarber.id] : undefined)
    .filter((appointment) => appointment.status === "CONFIRMED" && appointment.deposit_status === "PAID")
    .filter((appointment) => isSameLocalDay(appointment.scheduled_at, selectedDate))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const totalClientsToday = appointments.length;
  const totalReceivedToday = appointments.reduce((sum, item) => sum + item.deposit_in_cents, 0);

  return (
    <AppShell
      title="Área do barbeiro"
      subtitle="Agenda limpa de Gabriel Rodrigues, mostrando apenas clientes confirmados com pagamento já feito."
      myAreaHref="/admin"
      hideAdminLinks
      secondaryNav={
        <Link
          href="/admin/fechar-dia"
          className="rounded-full border border-amber-300/40 bg-amber-300/12 px-4 py-3 text-center font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(210,178,124,0.08)] transition hover:border-amber-300/60 hover:bg-amber-300/18 sm:px-4 sm:py-2"
        >
          Fechar dia ou horário
        </Link>
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

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[28px] sm:p-5">
            <p className="text-sm text-stone-400">Clientes do dia</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">{totalClientsToday}</p>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-stone-200">
              Gabriel Rodrigues - {totalClientsToday} cliente(s)
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[28px] sm:p-5">
            <p className="text-sm text-stone-400">Ganhos de Hoje</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">{formatMoney(totalReceivedToday)}</p>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-stone-200">
              Gabriel Rodrigues - {formatMoney(totalReceivedToday)}
            </div>
          </div>
        </div>

        <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-5">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Agenda</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Clientes pagos do dia</h2>
          <div className="mt-5 space-y-3 sm:space-y-4">
            {appointments.map((appointment) => {
              const avatarSrc = appointment.customer_avatar_path
                ? `${appointment.customer_avatar_path}?v=${encodeURIComponent(appointment.created_at)}`
                : null;
              const scheduleDate = new Date(appointment.scheduled_at);

              return (
                <div
                  key={appointment.id}
                  className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.12))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      {avatarSrc ? (
                        <Link
                          href={avatarSrc}
                          target="_blank"
                          className="block shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/20"
                          style={{ width: 56, height: 56, minWidth: 56, minHeight: 56, maxWidth: 56, maxHeight: 56 }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatarSrc}
                            alt={appointment.customer_name || "Cliente"}
                            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                          />
                        </Link>
                      ) : (
                        <div
                          className="flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-base font-semibold text-amber-100"
                          style={{ width: 56, height: 56, minWidth: 56, minHeight: 56, maxWidth: 56, maxHeight: 56 }}
                        >
                          {appointment.customer_name?.charAt(0).toUpperCase() || "C"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] uppercase tracking-[0.35em] text-amber-200/60">{appointment.protocol_code}</p>
                        <h3 className="mt-1 truncate text-xl text-amber-50">{appointment.customer_name}</h3>
                        <p className="mt-1 text-sm text-stone-300">{appointment.customer_phone}</p>
                      </div>
                    </div>
                    <div className="self-start rounded-full border border-emerald-400/55 bg-emerald-400/12 px-4 py-2 text-sm font-semibold text-emerald-200 shadow-[0_0_18px_rgba(61,220,132,0.18)] sm:shrink-0">
                      {formatMoney(appointment.deposit_in_cents)}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <div className="rounded-[20px] border border-amber-300/45 bg-amber-300/10 px-4 py-2 text-[28px] font-semibold leading-none text-amber-50">
                      {format(scheduleDate, "HH:mm")}
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-stone-200">
                      {format(scheduleDate, "dd/MM/yyyy")}
                    </div>
                    <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
                      {format(scheduleDate, "EEEE", { locale: ptBR }).toUpperCase()}
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-stone-200">
                      Gabriel Rodrigues
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    <div className="rounded-full border border-white/10 bg-black/10 px-3 py-2 text-sm text-stone-200">
                      {appointment.service_name}
                    </div>
                    <div className="rounded-full border border-emerald-400/35 bg-emerald-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                      Pagamento confirmado
                    </div>
                  </div>
                </div>
              );
            })}

            {!appointments.length ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
                Nenhum cliente confirmado para a data selecionada.
              </div>
            ) : null}
          </div>
        </section>

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
