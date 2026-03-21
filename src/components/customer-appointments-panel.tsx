"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, formatMoney } from "@/lib/format";

type Appointment = {
  id: string;
  protocol_code: string;
  service_name?: string;
  barber_name?: string;
  scheduled_at: string;
  deposit_in_cents?: number;
  total_price_in_cents?: number;
  checkout_amount_in_cents?: number;
  payment_scope?: string | null;
  deposit_status: string;
  paid_amount_in_cents?: number;
};

type Props = {
  pendingAppointments: Appointment[];
  confirmedAppointments: Appointment[];
  payment?: string;
};

async function postJson<T>(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(data.message || "Não conseguimos concluir essa ação agora.");
  }

  return data;
}

export function CustomerAppointmentsPanel({ pendingAppointments, confirmedAppointments, payment }: Props) {
  const router = useRouter();
  const [pendingList, setPendingList] = useState(pendingAppointments);
  const [confirmedList, setConfirmedList] = useState(confirmedAppointments);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const activePayment = useMemo(() => payment, [payment]);

  const startCheckout = async (appointmentId: string, paymentScope: "DEPOSIT" | "FULL") => {
    try {
      setErrorMessage("");
      setProcessingId(`${appointmentId}:${paymentScope}`);
      const result = await postJson<{ success: true; checkoutUrl?: string; redirectTo?: string }>(
        "/api/bookings/pay",
        {
          appointmentId,
          returnTo: "/cliente/minha-area#checkout",
          paymentScope,
        },
      );

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      if (result.redirectTo) {
        router.push(result.redirectTo);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não conseguimos abrir o pagamento agora.");
    } finally {
      setProcessingId(null);
    }
  };

  const cancelAppointment = async (appointmentId: string, isConfirmed: boolean) => {
    try {
      setErrorMessage("");
      setCancelingId(appointmentId);
      await postJson("/api/customer/appointments/cancel", {
        appointmentId,
        returnTo: "/cliente/minha-area#checkout",
      });

      if (isConfirmed) {
        setConfirmedList((current) => current.filter((appointment) => appointment.id !== appointmentId));
      } else {
        setPendingList((current) => current.filter((appointment) => appointment.id !== appointmentId));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não conseguimos cancelar essa reserva agora.");
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <>
      {errorMessage && activePayment !== "checkout-error" && activePayment !== "checkout-unavailable" ? (
        <div className="mb-4 rounded-[24px] border border-red-500/35 bg-red-500/10 p-4 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {pendingList.map((appointment) => {
          const payingFull = (appointment.payment_scope || "DEPOSIT") === "FULL";
          const depositAmount = appointment.deposit_in_cents || 0;
          const totalAmount = appointment.total_price_in_cents || depositAmount;
          const amountDue = appointment.checkout_amount_in_cents || depositAmount;

          return (
            <div
              key={appointment.id}
              data-appointment-id={appointment.id}
              className="rounded-[24px] border border-white/10 bg-black/15 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-200/60">{appointment.protocol_code}</p>
                  <h3 className="mt-2 text-xl text-amber-50">{appointment.service_name || "Reserva Dommus"}</h3>
                  <p className="mt-2 text-sm text-stone-300">
                    {(appointment.barber_name || "Barbeiro Dommus")} - {formatDateTime(appointment.scheduled_at)}
                  </p>
                </div>
                <div className="text-sm md:text-right">
                  <p className="text-stone-400">{payingFull ? "Valor total da reserva" : "Sinal da reserva"}</p>
                  <p className="font-semibold text-amber-100">{formatMoney(amountDue)}</p>
                  <p className="mt-1 font-medium text-amber-200">Pagamento pendente</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span
                  className={`rounded-full border px-3 py-2 ${
                    !payingFull
                      ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
                      : "border-white/10 bg-black/10 text-stone-300"
                  }`}
                >
                  Reservar com sinal: {formatMoney(depositAmount)}
                </span>
                <span
                  className={`rounded-full border px-3 py-2 ${
                    payingFull
                      ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                      : "border-white/10 bg-black/10 text-stone-300"
                  }`}
                >
                  Pagar tudo: {formatMoney(totalAmount)}
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={processingId === `${appointment.id}:DEPOSIT`}
                  onClick={() => void startCheckout(appointment.id, "DEPOSIT")}
                  className="rounded-2xl bg-amber-300 px-4 py-2 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingId === `${appointment.id}:DEPOSIT` ? "Abrindo..." : "Pagar sinal"}
                </button>
                <button
                  type="button"
                  disabled={processingId === `${appointment.id}:FULL`}
                  onClick={() => void startCheckout(appointment.id, "FULL")}
                  className="rounded-2xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-2 font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingId === `${appointment.id}:FULL` ? "Abrindo..." : "Pagar tudo"}
                </button>
                <button
                  type="button"
                  disabled={cancelingId === appointment.id}
                  onClick={() => void cancelAppointment(appointment.id, false)}
                  className="rounded-2xl border border-red-500/45 bg-red-500/10 px-4 py-2 font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelingId === appointment.id ? "Cancelando..." : "Cancelar e escolher novamente"}
                </button>
              </div>
            </div>
          );
        })}

        {!pendingList.length ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
            Nenhum pagamento pendente no momento.
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        {confirmedList.map((appointment) => (
          <div key={appointment.id} className="rounded-[24px] border border-white/10 bg-black/15 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/60">{appointment.protocol_code}</p>
                <h3 className="mt-2 text-xl text-amber-50">{appointment.service_name || "Reserva Dommus"}</h3>
                <p className="mt-2 text-sm text-stone-300">
                  {(appointment.barber_name || "Barbeiro Dommus")} - {formatDateTime(appointment.scheduled_at)}
                </p>
              </div>
              <div className="text-sm md:text-right">
                <p className="text-stone-400">
                  {appointment.paid_amount_in_cents && appointment.paid_amount_in_cents >= (appointment.total_price_in_cents || 0)
                    ? "Pagamento total"
                    : "Sinal da reserva"}
                </p>
                <p className="font-semibold text-amber-100">
                  {formatMoney(appointment.paid_amount_in_cents || appointment.deposit_in_cents || 0)}
                </p>
                <p className="mt-1 font-medium text-emerald-300">
                  {appointment.paid_amount_in_cents && appointment.paid_amount_in_cents >= (appointment.total_price_in_cents || 0)
                    ? "Pagamento total confirmado"
                    : "Pagamento confirmado"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <p className="text-sm text-emerald-300">
                Reserva ativa com protocolo pronto para identificação junto ao barbeiro.
              </p>
              <button
                type="button"
                disabled={cancelingId === appointment.id}
                onClick={() => void cancelAppointment(appointment.id, true)}
                className="rounded-2xl border border-red-500/45 bg-red-500/10 px-4 py-2 font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelingId === appointment.id ? "Cancelando..." : "Cancelar e escolher novamente"}
              </button>
            </div>
          </div>
        ))}

        {!confirmedList.length ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
            Nenhum protocolo confirmado no momento.
          </div>
        ) : null}
      </div>
    </>
  );
}
