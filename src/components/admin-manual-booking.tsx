"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SlotStatus = "available" | "booked" | "blocked" | "past";

type Slot = {
  time: string;
  status: SlotStatus;
  appointmentId?: string;
  blockedSlotId?: string;
};

type QuickDate = {
  label: string;
  shortLabel: string;
  value: string;
};

type Service = {
  id: string;
  name: string;
  priceCents: number;
};

type ManualBookingProps = {
  barberId: string;
  services: Service[];
  selectedServiceId: string;
  selectedDate: string;
  quickDates: QuickDate[];
  slots: Slot[];
};

type FormState = {
  customerName: string;
  customerPhone: string;
  serviceId: string;
  date: string;
  time: string;
};

const emptyState: FormState = {
  customerName: "",
  customerPhone: "",
  serviceId: "",
  date: "",
  time: "",
};

export function AdminManualBooking({
  barberId,
  services,
  selectedServiceId,
  selectedDate,
  quickDates,
  slots,
}: ManualBookingProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formState, setFormState] = useState<FormState>({
    ...emptyState,
    serviceId: selectedServiceId,
    date: selectedDate,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [localSlots, setLocalSlots] = useState<Slot[]>(slots);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    searchParams.get("success") === "1"
      ? "Agendamento manual criado com sucesso."
      : null,
  );
  const [confirmingSlot, setConfirmingSlot] = useState<string | null>(null);

  const dateSectionRef = useRef<HTMLDivElement | null>(null);
  const slotsSectionRef = useRef<HTMLDivElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const datePickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFormState((current) => ({
      ...current,
      serviceId: selectedServiceId,
      date: selectedDate,
      time: current.date === selectedDate ? current.time : "",
    }));
    setLocalSlots(slots);
  }, [selectedDate, selectedServiceId, slots]);

  useEffect(() => {
    if (!formState.serviceId) return;
    dateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [formState.serviceId]);

  useEffect(() => {
    if (!formState.date) return;
    slotsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [formState.date]);

  useEffect(() => {
    if (!formState.time) return;
    submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [formState.time]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === formState.serviceId) ?? null,
    [formState.serviceId, services],
  );

  const formattedDateValue = useMemo(() => {
    if (!formState.date) return "";
    const [year, month, day] = formState.date.split("-");
    if (!year || !month || !day) return formState.date;
    return `${day}/${month}/${year}`;
  }, [formState.date]);

  const updateSearchParams = useCallback(
    (serviceId: string, date: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (serviceId) {
        params.set("serviceId", serviceId);
      } else {
        params.delete("serviceId");
      }
      if (date) {
        params.set("date", date);
      } else {
        params.delete("date");
      }
      params.delete("success");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const refreshAvailability = useCallback(
    async (serviceId: string, date: string) => {
      if (!serviceId || !date) {
        setLocalSlots([]);
        return;
      }

      setIsLoadingSlots(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams({ barberId, serviceId, date });
        const response = await fetch(
          `/api/admin/manual-bookings/availability?${params.toString()}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error("Nao foi possivel atualizar os horarios.");
        }
        const payload = (await response.json()) as { slots: Slot[] };
        setLocalSlots(payload.slots);
      } catch (error) {
        console.error(error);
        setErrorMessage("Nao foi possivel atualizar os horarios agora.");
      } finally {
        setIsLoadingSlots(false);
      }
    },
    [barberId],
  );

  const handleServiceChange = async (serviceId: string) => {
    setFormState((current) => ({ ...current, serviceId, time: "" }));
    updateSearchParams(serviceId, formState.date);
    if (formState.date) {
      await refreshAvailability(serviceId, formState.date);
    }
  };

  const handleDateChange = async (date: string) => {
    setFormState((current) => ({ ...current, date, time: "" }));
    updateSearchParams(formState.serviceId, date);
    if (formState.serviceId) {
      await refreshAvailability(formState.serviceId, date);
    }
  };

  const openDatePicker = () => {
    const picker = datePickerRef.current;
    if (!picker) return;

    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }

    picker.click();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formState.customerName || !formState.customerPhone || !formState.serviceId || !formState.date || !formState.time) {
      setErrorMessage("Preencha nome, telefone, serviço, data e horário.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/manual-bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barberId,
          customerName: formState.customerName,
          customerPhone: formState.customerPhone,
          serviceId: formState.serviceId,
          date: formState.date,
          time: formState.time,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Nao foi possivel criar o agendamento manual.");
      }

      setSuccessMessage("Agendamento manual criado com sucesso.");
      setFormState((current) => ({
        ...emptyState,
        serviceId: current.serviceId,
        date: current.date,
      }));
      await refreshAvailability(formState.serviceId, formState.date);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Nao foi possivel criar o agendamento manual.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveBookedSlot = async (slot: Slot) => {
    const targetId = slot.appointmentId ?? slot.blockedSlotId;
    if (!targetId) return;

    setErrorMessage(null);
    try {
      const endpoint = slot.appointmentId
        ? "/api/admin/appointments/remove"
        : "/api/admin/blocks/remove";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          slot.appointmentId ? { appointmentId: targetId } : { blockId: targetId },
        ),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Não foi possível liberar esse horário.");
      }

      setConfirmingSlot(null);
      await refreshAvailability(formState.serviceId, formState.date);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível liberar esse horário.",
      );
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
      <section className="rounded-[2rem] border border-white/10 bg-[#2b2623] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-[#d6bf74]">Agendamento manual</p>
        <h1 className="mt-3 font-[var(--font-display)] text-4xl text-[#f9f1df] sm:text-5xl">
          Criar reserva pelo barbeiro
        </h1>
        <p className="mt-4 max-w-xl text-sm text-[#f1e7d6]/75 sm:text-base">
          Use esse fluxo para encaixar clientes que preferem marcar direto com o barbeiro.
          O pagamento fica combinado na hora.
        </p>

        {successMessage ? (
          <div className="mt-6 rounded-[1.35rem] border border-emerald-400/35 bg-emerald-500/12 px-5 py-4 text-sm text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 rounded-[1.35rem] border border-rose-400/35 bg-rose-500/12 px-5 py-4 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input
            className="h-14 w-full rounded-[1.1rem] border border-white/10 bg-[#1f1b18] px-5 text-base text-white outline-none transition focus:border-[#d6bf74]"
            placeholder="Nome do cliente"
            value={formState.customerName}
            onChange={(event) =>
              setFormState((current) => ({ ...current, customerName: event.target.value }))
            }
          />

          <input
            className="h-14 w-full rounded-[1.1rem] border border-white/10 bg-[#1f1b18] px-5 text-base text-white outline-none transition focus:border-[#d6bf74]"
            placeholder="Telefone do cliente"
            value={formState.customerPhone}
            onChange={(event) =>
              setFormState((current) => ({ ...current, customerPhone: event.target.value }))
            }
          />

          <select
            className="h-14 w-full rounded-[1.1rem] border border-white/10 bg-[#1f1b18] px-5 text-base text-white outline-none transition focus:border-[#d6bf74]"
            value={formState.serviceId}
            onChange={(event) => void handleServiceChange(event.target.value)}
          >
            <option value="">Escolha o servico</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {(service.priceCents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </option>
            ))}
          </select>

          <div ref={dateSectionRef} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickDates.map((quickDate) => {
                const isSelected = formState.date === quickDate.value;
                return (
                  <button
                    key={quickDate.value}
                    type="button"
                    className={`rounded-[1.15rem] border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-[#d6bf74] bg-[#3f3420] text-[#f9f1df]"
                        : "border-white/10 bg-[#221d1a] text-white/85 hover:border-[#d6bf74]/55"
                    }`}
                    onClick={() => void handleDateChange(quickDate.value)}
                  >
                    <span className="block text-[11px] uppercase tracking-[0.24em] text-[#d6bf74]">
                      {quickDate.label}
                    </span>
                    <span className="mt-1 block text-2xl font-semibold leading-none">
                      {quickDate.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={openDatePicker}
                className="h-14 w-full rounded-[1.1rem] border border-white/10 bg-[#1f1b18] px-5 text-left text-base text-white outline-none transition hover:border-[#d6bf74] focus:border-[#d6bf74]"
              >
                {formattedDateValue || "Escolha a data"}
              </button>
              <input
                ref={datePickerRef}
                type="date"
                value={formState.date}
                onChange={(event) => void handleDateChange(event.target.value)}
                className="pointer-events-none absolute inset-0 opacity-0"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </div>

          <button
            ref={submitButtonRef}
            type="submit"
            disabled={
              isSubmitting ||
              !formState.customerName ||
              !formState.customerPhone ||
              !formState.serviceId ||
              !formState.date ||
              !formState.time
            }
            className="h-14 w-full rounded-[1.1rem] bg-[#ffd24a] px-5 text-lg font-semibold text-[#1b1307] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#6a6254] disabled:text-white/60"
          >
            {isSubmitting ? "Criando agendamento..." : "Confirmar agendamento manual"}
          </button>
        </form>
      </section>

      <section
        ref={slotsSectionRef}
        className="rounded-[2rem] border border-white/10 bg-[#2b2623] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:p-8"
      >
        <p className="text-xs uppercase tracking-[0.35em] text-[#d6bf74]">Agenda do barbeiro</p>
        <h2 className="mt-3 font-[var(--font-display)] text-4xl text-[#f9f1df] sm:text-5xl">
          Escolha o horário com facilidade
        </h2>
        <p className="mt-4 text-sm text-[#f1e7d6]/75 sm:text-base">
          Barbeiro: Gabriel Rodrigues. Servico: {selectedService?.name ?? "Escolha um servico"}
          {selectedService
            ? ` (${(selectedService.priceCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}).`
            : "."}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {isLoadingSlots ? (
            <div className="col-span-full rounded-[1.3rem] border border-white/10 bg-[#1f1b18] px-5 py-6 text-sm text-white/70">
              Carregando horarios...
            </div>
          ) : null}

          {!isLoadingSlots && localSlots.length === 0 ? (
            <div className="col-span-full rounded-[1.3rem] border border-dashed border-white/10 bg-[#1f1b18] px-5 py-6 text-sm text-white/60">
              Escolha um servico e uma data para ver os horarios.
            </div>
          ) : null}

          {!isLoadingSlots
            ? localSlots.map((slot) => {
                const isSelected = formState.time === slot.time;
                const isUnavailable = slot.status !== "available";
                const isConfirming = confirmingSlot === slot.time;

                if (isConfirming) {
                  return (
                    <div
                      key={`${slot.time}-confirm`}
                      className="rounded-[1.1rem] border border-rose-400/35 bg-rose-500/12 px-3 py-3 text-center"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">
                        Liberar horário?
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-full bg-rose-500 px-3 py-2 text-sm font-semibold text-white"
                          onClick={() => void handleRemoveBookedSlot(slot)}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-full border border-white/15 px-3 py-2 text-sm font-semibold text-white/80"
                          onClick={() => setConfirmingSlot(null)}
                        >
                          Nao
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={slot.status === "past" || slot.status === "blocked"}
                    className={`relative rounded-[1.1rem] border px-4 py-4 text-center text-lg font-semibold transition ${
                      slot.status === "available"
                        ? isSelected
                          ? "border-[#d6bf74] bg-[#3f3420] text-[#f9f1df]"
                          : "border-white/10 bg-[#221d1a] text-white/85 hover:border-[#d6bf74]/55"
                        : slot.status === "booked"
                          ? "border-rose-500/40 bg-rose-500/10 text-white/65"
                          : slot.status === "blocked"
                            ? "border-amber-500/35 bg-amber-500/10 text-white/55"
                            : "border-white/5 bg-[#1c1815] text-white/35"
                    }`}
                    onClick={() => {
                      if (slot.status === "available") {
                        setFormState((current) => ({ ...current, time: slot.time }));
                        return;
                      }
                      if (slot.status === "booked") {
                        setConfirmingSlot(slot.time);
                      }
                    }}
                  >
                    {slot.time}
                    {slot.status === "booked" ? (
                      <span className="absolute right-3 top-3 text-sm text-rose-200">x</span>
                    ) : null}
                    {isUnavailable ? (
                      <span className="mt-1 block text-[11px] uppercase tracking-[0.22em] text-white/45">
                        {slot.status === "booked"
                          ? "Marcado"
                          : slot.status === "blocked"
                            ? "Bloqueado"
                            : "Encerrado"}
                      </span>
                    ) : null}
                  </button>
                );
              })
            : null}
        </div>
      </section>
    </div>
  );
}
