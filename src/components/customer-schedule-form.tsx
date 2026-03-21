"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type SlotItem = {
  time: string;
  status: "available" | "booked" | "blocked" | "past";
};

type BookingResponse = {
  success?: boolean;
  redirectTo?: string;
  message?: string;
  code?: string;
};

export function CustomerScheduleForm({
  serviceIds,
  barberId,
  selectedDate,
  slots,
}: {
  serviceIds: string[];
  barberId: string;
  selectedDate: string;
  slots: SlotItem[];
}) {
  const router = useRouter();
  const [selectedTime, setSelectedTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submitRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selectedTime) {
      return;
    }

    const timer = window.setTimeout(() => {
      submitRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [selectedTime]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTime || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          serviceIds,
          barberId,
          date: selectedDate,
          time: selectedTime,
        }),
      });

      const payload = (await response.json().catch(() => null)) as BookingResponse | null;

      if (!response.ok || !payload?.redirectTo) {
        setErrorMessage(
          payload?.message || "Não conseguimos criar sua reserva agora. Tente novamente em instantes.",
        );
        return;
      }

      router.push(payload.redirectTo);
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage("Não conseguimos criar sua reserva agora. Tente novamente em instantes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {slots.length ? (
          slots.map((slot) => (
            <label
              key={`${selectedDate}-${slot.time}`}
              className={`block ${slot.status === "available" ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              <input
                className="peer sr-only"
                type="radio"
                name="time"
                value={slot.time}
                required
                disabled={slot.status !== "available" || isSubmitting}
                checked={selectedTime === slot.time}
                onChange={() => {
                  setSelectedTime(slot.time);
                  setErrorMessage(null);
                }}
              />
              <div
                className={`rounded-2xl border px-4 py-3 text-center text-sm transition ${
                  slot.status === "available"
                    ? "border-white/10 bg-white/5 peer-checked:border-amber-300 peer-checked:bg-amber-300/10 hover:border-amber-200/40"
                    : slot.status === "booked" || slot.status === "blocked"
                      ? "border-red-500/30 bg-red-500/10 text-red-200"
                      : "border-white/10 bg-black/25 text-stone-500"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>{slot.time}</span>
                  {slot.status === "booked" || slot.status === "blocked" ? <X className="size-4 text-red-300" /> : null}
                </div>
                {slot.status === "booked" ? (
                  <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-red-200/80">Marcado</p>
                ) : null}
                {slot.status === "blocked" ? (
                  <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-red-200/80">Bloqueado</p>
                ) : null}
              </div>
            </label>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-6 text-sm text-stone-400 md:col-span-4">
            Nenhum horário livre nessa data para esse conjunto de serviços. Tente outro dia.
          </div>
        )}
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <button
        ref={submitRef}
        type="submit"
        disabled={!selectedTime || isSubmitting}
        className="rounded-2xl border border-amber-300/60 px-6 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-stone-500"
      >
        {isSubmitting ? "Criando reserva..." : "Criar reserva e gerar protocolo"}
      </button>
    </form>
  );
}
