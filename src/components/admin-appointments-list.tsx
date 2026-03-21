"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatBrazilDate, formatBrazilTime, formatBrazilWeekday } from "@/lib/brazil-time";
import { formatMoney } from "@/lib/format";

type AdminAppointment = {
  id: string;
  protocol_code: string;
  customer_name?: string;
  customer_phone?: string;
  customer_avatar_path?: string | null;
  scheduled_at: string;
  service_name?: string;
  paid_amount_in_cents?: number;
  deposit_in_cents: number;
  manual_customer_name?: string | null;
  manual_customer_phone?: string | null;
  created_at: string;
};

export function AdminAppointmentsList({ initialAppointments }: { initialAppointments: AdminAppointment[] }) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasAppointments = useMemo(() => appointments.length > 0, [appointments]);

  async function handleDelete(appointmentId: string) {
    setDeletingId(appointmentId);

    try {
      const response = await fetch("/api/admin/appointments/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        throw new Error("Falha ao excluir agendamento.");
      }

      setAppointments((current) => current.filter((appointment) => appointment.id !== appointmentId));
      setConfirmingId(null);
    } catch (error) {
      console.error(error);
      window.alert("Não conseguimos excluir o agendamento agora. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-5 space-y-3 sm:space-y-4">
      {appointments.map((appointment) => {
        const avatarSrc = appointment.customer_avatar_path
          ? `${appointment.customer_avatar_path}?v=${encodeURIComponent(appointment.created_at)}`
          : null;
        const scheduleDate = new Date(appointment.scheduled_at);
        const isManual = Boolean(appointment.manual_customer_name || appointment.manual_customer_phone);
        const isConfirming = confirmingId === appointment.id;
        const isDeleting = deletingId === appointment.id;

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
              <div className="flex items-start gap-2 sm:shrink-0">
                <div className="self-start rounded-full border border-emerald-400/55 bg-emerald-400/12 px-4 py-2 text-sm font-semibold text-emerald-200 shadow-[0_0_18px_rgba(61,220,132,0.18)]">
                  {formatMoney(appointment.paid_amount_in_cents || appointment.deposit_in_cents)}
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmingId((current) => (current === appointment.id ? null : appointment.id))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-red-400/35 bg-red-500/10 text-lg font-semibold text-red-200 transition hover:bg-red-500/20"
                  aria-label="Excluir agendamento"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <div className="rounded-[20px] border border-amber-300/45 bg-amber-300/10 px-4 py-2 text-[28px] font-semibold leading-none text-amber-50">
                {formatBrazilTime(scheduleDate)}
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-stone-200">
                {formatBrazilDate(scheduleDate)}
              </div>
              <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
                {formatBrazilWeekday(scheduleDate, true)}
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-stone-200">
                Gabriel Rodrigues
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <div className="rounded-full border border-white/10 bg-black/10 px-3 py-2 text-sm text-stone-200">
                {appointment.service_name}
              </div>
              <div
                className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                  isManual
                    ? "border border-sky-400/35 bg-sky-400/10 text-sky-200"
                    : "border border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                }`}
              >
                {isManual ? "Agendamento manual" : "Pagamento confirmado"}
              </div>
            </div>

            {isConfirming ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[18px] border border-red-400/20 bg-red-500/8 px-4 py-3">
                <p className="text-sm text-red-100">Tem certeza que deseja excluir esse agendamento?</p>
                <button
                  type="button"
                  onClick={() => void handleDelete(appointment.id)}
                  disabled={isDeleting}
                  className="rounded-full border border-red-400/35 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/22 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? "Excluindo..." : "Sim"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  disabled={isDeleting}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-stone-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Não
                </button>
              </div>
            ) : null}
          </div>
        );
      })}

      {!hasAppointments ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-5 text-sm text-stone-400">
          Nenhum cliente confirmado para a data selecionada.
        </div>
      ) : null}
    </div>
  );
}
