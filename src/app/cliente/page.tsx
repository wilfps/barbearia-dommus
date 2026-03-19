import { addDays, format } from "date-fns";
import { AppShell } from "@/components/shell";
import { CustomerScheduleForm } from "@/components/customer-schedule-form";
import { ServiceSelectionForm } from "@/components/service-selection-form";
import { getBookingDurationMinutes, listScheduleSlots } from "@/lib/booking";
import { requireRoles } from "@/lib/auth";
import { formatBrazilDateInput, formatBrazilTime, getBrazilDayRange, toBrazilDateObject } from "@/lib/brazil-time";
import {
  ensureBlockedDay,
  getPrimaryBarber,
  listAppointmentsByBarberOnDate,
  listBlockedSlotsByBarberOnDate,
  listServices,
} from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getQuickWeekDates } from "@/lib/quick-dates";

type SearchParams = Promise<{
  date?: string | string[];
  serviceIds?: string;
  serviceId?: string | string[];
}>;

function normalizeSelectedServiceIds(
  rawCombined: string | undefined,
  rawLegacy: string | string[] | undefined,
  allServiceIds: string[],
) {
  const combined = rawCombined
    ? rawCombined
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const legacy = Array.isArray(rawLegacy) ? rawLegacy : rawLegacy ? [rawLegacy] : [];
  const values = [...combined, ...legacy];
  return values.filter((value, index) => allServiceIds.includes(value) && values.indexOf(value) === index);
}

export default async function ClientePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRoles(["CUSTOMER", "OWNER"]);
  const params = await searchParams;
  const selectedDate = Array.isArray(params.date)
    ? params.date[0] ?? format(addDays(new Date(), 1), "yyyy-MM-dd")
    : params.date ?? format(addDays(new Date(), 1), "yyyy-MM-dd");

  const [services, selectedBarber] = await Promise.all([
    Promise.resolve(listServices()),
    Promise.resolve(getPrimaryBarber()),
  ]);

  if (selectedBarber) {
    getQuickWeekDates(new Date())
      .filter((item) => item.rolledToNextWeek)
      .forEach((item) => {
        ensureBlockedDay(selectedBarber.id, item.iso, "Fechado por padrão até o barbeiro liberar");
      });
  }

  const selectedServiceIds = normalizeSelectedServiceIds(
    params.serviceIds,
    params.serviceId,
    services.map((service) => service.id),
  );
  const selectedServices = services.filter((service) => selectedServiceIds.includes(service.id));
  const totalPriceInCents = selectedServices.reduce((sum, service) => sum + service.price_in_cents, 0);
  const totalDurationMinutes = getBookingDurationMinutes(selectedServices);
  const firstService = selectedServices[0];
  const serviceSummary = selectedServices.map((service) => service.name).join(" + ");
  const allBlockedSlots = selectedBarber
    ? listBlockedSlotsByBarberOnDate(selectedBarber.id, new Date().toISOString(), new Date("2099-12-31T23:59:59").toISOString())
    : [];
  const blockedFullDayDates = allBlockedSlots
    .filter((slot) => formatBrazilTime(slot.starts_at) === "00:00" && formatBrazilTime(slot.ends_at) === "23:59")
    .map((slot) => formatBrazilDateInput(slot.starts_at));
  const isSelectedDateBlocked = blockedFullDayDates.includes(selectedDate);

  const selectedDayRange = getBrazilDayRange(selectedDate);

  const [appointments, blockedSlots] =
    selectedBarber && firstService
      ? await Promise.all([
          Promise.resolve(
            listAppointmentsByBarberOnDate(selectedBarber.id, selectedDayRange.startIso, selectedDayRange.endIso),
          ),
          Promise.resolve(
            listBlockedSlotsByBarberOnDate(selectedBarber.id, selectedDayRange.startIso, selectedDayRange.endIso),
          ),
        ])
      : [[], []];

  const slots =
    selectedBarber && firstService
      ? listScheduleSlots({
          date: toBrazilDateObject(selectedDate, "00:00:00"),
          barber: selectedBarber,
          service: {
            ...firstService,
            duration_minutes: totalDurationMinutes,
            price_in_cents: totalPriceInCents,
            name: serviceSummary || firstService.name,
          },
          appointments,
          blockedSlots,
        })
      : [];

  const serializedSlots = slots.map((slot) => ({
    time: formatBrazilTime(slot.time),
    status: slot.status,
  }));

  return (
    <AppShell
      title={`Área do cliente, ${user.name.split(" ")[0]}`}
      subtitle="Escolha um ou mais serviços, reserve o horário com Gabriel Rodrigues e acompanhe seus protocolos de agendamento."
      myAreaHref="/cliente/minha-area"
      hideAdminLinks
    >
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          {!user.birth_date ? (
            <section className="rounded-[24px] border border-amber-300/35 bg-amber-300/10 p-4 text-amber-50 sm:rounded-[28px] sm:p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">Cadastro incompleto</p>
              <h2 className="mt-2 text-xl">Preencha sua data de nascimento</h2>
              <p className="mt-2 text-sm text-stone-200">
                Para completar seu cadastro e receber mensagens especiais da Dommus, atualize sua data de nascimento na sua área.
              </p>
            </section>
          ) : null}

          <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Agendamento</p>
                <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Escolha um ou mais serviços</h2>
              </div>
              <p className="max-w-xl text-sm text-stone-300">
                Para segurar o horário, o cliente precisa pagar 50% do valor total. Serviços completos usam o tempo somado de forma seguida, sem quebrar a reserva.
              </p>
            </div>

            <ServiceSelectionForm
              services={services}
              initialSelectedIds={selectedServiceIds}
              initialDate={selectedDate}
              barberName={selectedBarber?.name ?? "Gabriel Rodrigues"}
              blockedFullDayDates={blockedFullDayDates}
            />
          </section>

          <section id="horarios" className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Horário</p>
                <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Fechar reserva</h2>
              </div>
              {selectedServices.length ? (
                <p className="text-sm text-stone-300">
                  Sinal agora: <span className="font-semibold text-amber-100">{formatMoney(Math.round(totalPriceInCents / 2))}</span>
                </p>
              ) : null}
            </div>

            <div className="mt-6">
              {selectedServices.length && selectedBarber && !isSelectedDateBlocked ? (
                <CustomerScheduleForm
                  serviceIds={selectedServices.map((service) => service.id)}
                  barberId={selectedBarber.id}
                  selectedDate={selectedDate}
                  slots={serializedSlots}
                />
              ) : selectedServices.length && isSelectedDateBlocked ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-sm text-red-100">
                  Esse dia está bloqueado pelo barbeiro. Escolha outra data para ver os horários disponíveis.
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-6 text-sm text-stone-400">
                  Escolha pelo menos um serviço e selecione a data para ver a agenda atualizada.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6" />
      </div>
    </AppShell>
  );
}
