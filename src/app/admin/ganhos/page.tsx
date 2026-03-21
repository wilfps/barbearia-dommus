import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminDateNavigation } from "@/components/admin-date-navigation";
import { AppShell } from "@/components/shell";
import { requireRoles } from "@/lib/auth";
import { formatBrazilDateInput } from "@/lib/brazil-time";
import { getPrimaryBarber, listAppointmentsForAdmin } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { normalizeWorkingDate } from "@/lib/quick-dates";

type SearchParams = Promise<{ date?: string }>;

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (/[",;\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsvDataUri(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const csv = [
    headers.map((header) => escapeCsv(header)).join(";"),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(";")),
  ].join("\n");

  return `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(csv)}`;
}

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

export default async function AdminGanhosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);
  const params = await searchParams;
  const selectedDate = normalizeDateInput(params.date);
  const primaryBarber = getPrimaryBarber();
  const monthSummary = getMonthSummary(selectedDate);

  const paidAppointments = listAppointmentsForAdmin(primaryBarber ? [primaryBarber.id] : undefined)
    .filter((appointment) => appointment.status === "CONFIRMED" && appointment.deposit_status === "PAID")
    .filter((appointment) => formatBrazilDateInput(appointment.scheduled_at).slice(0, 7) === monthSummary.selectedMonth)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const totalReceivedMonth = paidAppointments.reduce(
    (sum, item) => sum + (item.paid_amount_in_cents || item.deposit_in_cents),
    0,
  );
  const serviceTotals = paidAppointments.reduce<Record<string, { count: number; total: number }>>((acc, appointment) => {
    const serviceName = appointment.service_name || "Serviço não informado";
    const current = acc[serviceName] ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += appointment.paid_amount_in_cents || appointment.deposit_in_cents;
    acc[serviceName] = current;
    return acc;
  }, {});
  const topServiceEntry = Object.entries(serviceTotals).sort((a, b) => b[1].count - a[1].count)[0];
  const gainsCsvHref = buildCsvDataUri(
    ["Protocolo", "Cliente", "Telefone", "Serviço", "Barbeiro", "Data", "Tipo de pagamento", "Valor recebido"],
    paidAppointments.map((appointment) => [
      appointment.protocol_code,
      appointment.customer_name,
      appointment.customer_phone,
      appointment.service_name,
      appointment.barber_name,
      formatDateTime(appointment.scheduled_at),
      appointment.payment_scope === "FULL" ? "Pagamento total" : "Sinal pago",
      formatMoney(appointment.paid_amount_in_cents || appointment.deposit_in_cents),
    ]),
  );

  return (
    <AppShell
      title="Ganhos do barbeiro"
      subtitle="Veja todos os clientes e serviços pagos no mês selecionado."
      myAreaHref="/admin"
      hideAdminLinks
      secondaryNav={
        <>
          <a
            href={gainsCsvHref}
            download={`ganhos-dommus-${monthSummary.selectedMonth}.csv`}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-center font-medium text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-amber-300/50 hover:bg-amber-300/10 sm:px-4 sm:py-2"
          >
            Baixar ganhos CSV
          </a>
          <Link
            href={`/admin?date=${selectedDate}`}
            className="rounded-full border border-amber-300/40 bg-amber-300/12 px-4 py-3 text-center font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(210,178,124,0.08)] transition hover:border-amber-300/60 hover:bg-amber-300/18 sm:px-4 sm:py-2"
          >
            Voltar para o painel
          </Link>
        </>
      }
    >
      <div className="grid gap-5 sm:gap-6">
        <section className="glass flex flex-col gap-4 rounded-[24px] p-4 sm:rounded-[30px] sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Financeiro</p>
            <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Ganhos de {monthSummary.monthName}</h2>
            <p className="mt-2 text-sm text-stone-300">{monthSummary.rangeLabel}</p>
          </div>
          <AdminDateNavigation selectedDate={selectedDate} />
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[28px] sm:p-5">
            <p className="text-sm text-stone-400">Total recebido no mês</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">{formatMoney(totalReceivedMonth)}</p>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-stone-200">
              Gabriel Rodrigues - {formatMoney(totalReceivedMonth)}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[28px] sm:p-5">
            <p className="text-sm text-stone-400">Pagamentos confirmados</p>
            <p className="mt-3 text-3xl font-semibold text-amber-50">{paidAppointments.length}</p>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-stone-200">
              Clientes e serviços pagos no mês selecionado
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[28px] sm:p-5">
            <p className="text-sm text-stone-400">Serviço que mais girou</p>
            <p className="mt-3 text-xl font-semibold text-amber-50">
              {topServiceEntry ? topServiceEntry[0] : "Sem atendimentos"}
            </p>
            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-stone-200">
              {topServiceEntry
                ? `${topServiceEntry[1].count} atendimento(s) - ${formatMoney(topServiceEntry[1].total)}`
                : "Ainda não há pagamentos suficientes para este mês."}
            </div>
          </div>
        </div>

        <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-5">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Lista completa</p>
          <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Clientes e serviços pagos</h2>

          <div className="mt-6 space-y-4">
            {paidAppointments.length ? (
              paidAppointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-[24px] border border-white/10 bg-black/15 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-amber-200/60">
                        {appointment.protocol_code}
                      </p>
                      <h3 className="mt-2 text-xl text-amber-50">{appointment.customer_name}</h3>
                      <p className="mt-2 text-sm text-stone-300">
                        {appointment.customer_phone || "Sem telefone informado"}
                      </p>
                      <p className="mt-2 text-sm text-stone-300">{appointment.service_name}</p>
                      <p className="mt-2 text-sm text-stone-400">
                        {appointment.barber_name} - {formatDateTime(appointment.scheduled_at)}
                      </p>
                    </div>

                    <div className="text-sm md:text-right">
                      <p className="text-stone-400">
                        {appointment.payment_scope === "FULL" ? "Pagamento total" : "Sinal pago"}
                      </p>
                      <p className="font-semibold text-emerald-200">
                        {formatMoney(appointment.paid_amount_in_cents || appointment.deposit_in_cents)}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
                Nenhum pagamento confirmado encontrado nesse mês.
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
