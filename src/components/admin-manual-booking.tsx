"use client";

import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getQuickWeekDates } from "@/lib/quick-dates";
import { formatMoney } from "@/lib/format";

type ServiceItem = {
  id: string;
  name: string;
  price_in_cents: number;
  duration_minutes: number;
};

type SlotState = {
  time: string;
  status: "available" | "booked" | "blocked" | "past";
  appointmentId?: string | null;
  blockedSlotId?: string | null;
};

export function AdminManualBooking({
  services,
  barberName,
  initialDate,
  initialServiceId,
  success,
  error,
}: {
  services: ServiceItem[];
  barberName: string;
  initialDate: string;
  initialServiceId?: string;
  success?: boolean;
  error?: string;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceId, setServiceId] = useState(initialServiceId || services[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [dateDisplayValue, setDateDisplayValue] = useState(
    format(parse(initialDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy"),
  );
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotNotice, setSlotNotice] = useState("");
  const [isBlockedDay, setIsBlockedDay] = useState(false);
  const [confirmingSlot, setConfirmingSlot] = useState<SlotState | null>(null);
  const [removingSlot, setRemovingSlot] = useState(false);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services],
  );

  const quickDates = useMemo(
    () =>
      getQuickWeekDates(new Date()).map((item) => ({
        value: item.iso,
        label: format(item.date, "EEEE", { locale: ptBR }),
        shortDate: format(item.date, "dd/MM"),
      })),
    [],
  );

  const loadSlots = useCallback(async () => {
    if (!selectedDate || !serviceId) {
      return;
    }

    setLoadingSlots(true);
    setSlotNotice("");

    try {
      const response = await fetch(
        `/api/admin/manual-bookings/availability?date=${encodeURIComponent(selectedDate)}&serviceId=${encodeURIComponent(serviceId)}`,
      );

      if (!response.ok) {
        throw new Error("Falha ao carregar horários.");
      }

      const payload = (await response.json()) as { slots: SlotState[]; isBlockedDay: boolean };
      setSlots(payload.slots);
      setIsBlockedDay(payload.isBlockedDay);
      setSelectedTime("");
      setConfirmingSlot(null);

      if (payload.isBlockedDay) {
        setSlotNotice("Esse dia está fechado pelo barbeiro.");
      } else if (!payload.slots.some((slot) => slot.status === "available")) {
        setSlotNotice("Nenhum horário livre para essa combinação.");
      }
    } catch {
      setSlots([]);
      setSelectedTime("");
      setConfirmingSlot(null);
      setSlotNotice("Não foi possível carregar os horários agora.");
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, serviceId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  function updateDateFromIso(isoDate: string) {
    setSelectedDate(isoDate);
    const parsed = parse(isoDate, "yyyy-MM-dd", new Date());
    setDateDisplayValue(isValid(parsed) ? format(parsed, "dd/MM/yyyy") : "");
  }

  function updateDateFromDisplay(displayDate: string) {
    setDateDisplayValue(displayDate);
    const parsed = parse(displayDate, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      setSelectedDate(format(parsed, "yyyy-MM-dd"));
    }
  }

  async function handleRemoveBookedSlot() {
    if (!confirmingSlot?.appointmentId) {
      return;
    }

    setRemovingSlot(true);

    try {
      const response = await fetch("/api/admin/appointments/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appointmentId: confirmingSlot.appointmentId }),
      });

      if (!response.ok) {
        throw new Error("Falha ao excluir o horário.");
      }

      const releasedTime = confirmingSlot.time;
      await loadSlots();
      setSlotNotice(`Horário ${releasedTime} liberado com sucesso.`);
    } catch (error) {
      console.error(error);
      window.alert("Não conseguimos excluir esse horário agora. Tente novamente.");
    } finally {
      setRemovingSlot(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Agendamento manual</p>
        <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Criar reserva pelo barbeiro</h2>
        <p className="mt-3 text-sm text-stone-300">
          Use esse fluxo para encaixar clientes que preferem marcar direto com o barbeiro. O pagamento fica combinado na hora.
        </p>

        {success ? (
          <div className="mt-5 rounded-[22px] border border-emerald-400/35 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            Agendamento manual criado com sucesso.
          </div>
        ) : null}
        {error === "slot-unavailable" ? (
          <div className="mt-5 rounded-[22px] border border-red-500/35 bg-red-500/10 p-4 text-sm text-red-100">
            Esse horário já foi ocupado ou bloqueado. Escolha outro horário.
          </div>
        ) : null}
        {error === "missing-fields" ? (
          <div className="mt-5 rounded-[22px] border border-red-500/35 bg-red-500/10 p-4 text-sm text-red-100">
            Preencha nome, telefone, serviço, data e horário para concluir o agendamento.
          </div>
        ) : null}

        <form action="/api/admin/manual-bookings" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="date" value={selectedDate} />
          <input type="hidden" name="time" value={selectedTime} />

          <input
            name="customerName"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Nome do cliente"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
          />
          <input
            name="customerPhone"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            placeholder="Telefone do cliente"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
          />
          <select
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {formatMoney(service.price_in_cents)}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {quickDates.map((date) => {
              const isSelected = selectedDate === date.value;
              return (
                <button
                  key={date.value}
                  type="button"
                  onClick={() => updateDateFromIso(date.value)}
                  className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    isSelected
                      ? "border-amber-300 bg-amber-300/12 text-amber-100"
                      : "border-white/10 bg-black/20 text-stone-200 hover:border-amber-200/35 hover:bg-amber-300/8"
                  }`}
                >
                  <span className="block text-[10px] uppercase tracking-[0.28em] text-amber-200/70">{date.label}</span>
                  <span className="mt-1 block text-base font-semibold">{date.shortDate}</span>
                </button>
              );
            })}
          </div>

          <input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            value={dateDisplayValue}
            onChange={(event) => updateDateFromDisplay(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
          />

          <textarea
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observação opcional"
            className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
          />

          <button
            type="submit"
            disabled={!customerName.trim() || !customerPhone.trim() || !selectedTime || isBlockedDay}
            className="rounded-2xl bg-amber-300 px-5 py-3 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-stone-600 disabled:text-stone-300"
          >
            Confirmar agendamento manual
          </button>
        </form>
      </section>

      <section className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Agenda do barbeiro</p>
        <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Escolha o horário com facilidade</h2>
        <p className="mt-3 text-sm text-stone-300">
          Barbeiro: {barberName}. {selectedService ? `Serviço: ${selectedService.name} (${formatMoney(selectedService.price_in_cents)}).` : ""}
        </p>

        <div className="mt-6">
          {loadingSlots ? (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
              Carregando horários...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={slot.status === "past" || slot.status === "blocked"}
                    onClick={() => {
                      if (slot.status === "available") {
                        setSelectedTime(slot.time);
                        setConfirmingSlot(null);
                        return;
                      }

                      if (slot.status === "booked" && slot.appointmentId) {
                        setConfirmingSlot(slot);
                      }
                    }}
                    className={`rounded-2xl border px-4 py-3 text-sm transition ${
                      selectedTime === slot.time
                        ? "border-amber-300 bg-amber-300/12 text-amber-100"
                        : slot.status === "available"
                          ? "border-white/10 bg-white/5 text-stone-100 hover:border-amber-200/40"
                          : slot.status === "booked" || slot.status === "blocked"
                            ? "border-red-500/30 bg-red-500/10 text-red-200"
                            : "border-white/10 bg-black/25 text-stone-500"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>{slot.time}</span>
                      {slot.status === "booked" || slot.status === "blocked" ? <X className="size-4 text-red-300" /> : null}
                    </div>
                    {slot.status === "booked" ? <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-red-200/80">Marcado</p> : null}
                    {slot.status === "blocked" ? <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-red-200/80">Bloqueado</p> : null}
                  </button>
                ))}
              </div>

              {confirmingSlot?.status === "booked" && confirmingSlot.appointmentId ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[22px] border border-red-500/25 bg-red-500/10 p-4 text-sm">
                  <p className="text-red-100">Tem certeza que deseja excluir o horário {confirmingSlot.time} e liberar a vaga?</p>
                  <button
                    type="button"
                    onClick={() => void handleRemoveBookedSlot()}
                    disabled={removingSlot}
                    className="rounded-full border border-red-400/35 bg-red-500/15 px-4 py-2 font-semibold text-red-100 transition hover:bg-red-500/22 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingSlot ? "Excluindo..." : "Sim"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingSlot(null)}
                    disabled={removingSlot}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-semibold text-stone-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Não
                  </button>
                </div>
              ) : null}

              {!slots.length || slotNotice ? (
                <div className="mt-4 rounded-[22px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
                  {slotNotice || "Escolha um serviço e uma data para ver os horários do barbeiro."}
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
