"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock3, LockKeyhole, MessageCircle, Scissors } from "lucide-react";
import { formatBrazilDate, formatBrazilTime } from "@/lib/brazil-time";
import { buildWhatsAppLink, formatMoney } from "@/lib/format";

type AgendaAppointment = {
  id: string;
  customerName: string;
  serviceName: string;
  scheduledAt: string;
  paidLabel: string;
  customerPhone?: string;
  amountLabel?: string;
};

type AgendaSlot = {
  time: string;
  appointment?: AgendaAppointment;
  blocked?: boolean;
};

function buildFollowUpMessage(appointment: AgendaAppointment) {
  return `Olá, ${appointment.customerName}! Aqui é da Dommus Barbearia. Seu horário de ${appointment.serviceName} está reservado para ${formatBrazilDate(appointment.scheduledAt)} às ${formatBrazilTime(appointment.scheduledAt)}.`;
}

export function AdminDailyAgendaView({
  appointments,
  slots,
}: {
  appointments: AgendaAppointment[];
  slots: AgendaSlot[];
}) {
  const [selectedSlot, setSelectedSlot] = useState<AgendaSlot | null>(null);

  const summary = useMemo(() => {
    const occupied = slots.filter((slot) => slot.appointment).length;
    const blocked = slots.filter((slot) => !slot.appointment && slot.blocked).length;
    const free = slots.filter((slot) => !slot.appointment && !slot.blocked).length;
    return { occupied, blocked, free };
  }, [slots]);

  const totalDay = useMemo(() => {
    return appointments.reduce((sum, appointment) => {
      const numeric = Number(String(appointment.amountLabel || "").replace(/[^\d,]/g, "").replace(",", "."));
      return Number.isFinite(numeric) ? sum + Math.round(numeric * 100) : sum;
    }, 0);
  }, [appointments]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_1.2fr]">
      <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Clientes agendados</p>
        <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Agenda do dia</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-white/10 bg-black/15 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/60">Atendimentos</p>
            <p className="mt-2 text-2xl font-semibold text-amber-50">{appointments.length}</p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-black/15 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/60">Previsão</p>
            <p className="mt-2 text-2xl font-semibold text-amber-50">{formatMoney(totalDay)}</p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-black/15 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/60">Horários livres</p>
            <p className="mt-2 text-2xl font-semibold text-amber-50">{summary.free}</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {appointments.length ? (
            appointments.map((appointment) => (
              <article key={appointment.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-amber-50">{appointment.customerName}</p>
                    <p className="mt-1 text-sm text-stone-300">{appointment.serviceName}</p>
                    <p className="mt-2 text-sm text-stone-400">
                      {`${formatBrazilDate(appointment.scheduledAt)} às ${formatBrazilTime(appointment.scheduledAt)}`}
                    </p>
                    {appointment.customerPhone ? <p className="mt-1 text-sm text-stone-500">{appointment.customerPhone}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100">
                      {appointment.paidLabel}
                    </span>
                    {appointment.amountLabel ? <span className="text-sm font-semibold text-amber-100">{appointment.amountLabel}</span> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {appointment.customerPhone ? (
                    <a
                      href={buildWhatsAppLink(appointment.customerPhone, buildFollowUpMessage(appointment))}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/18"
                    >
                      <MessageCircle className="mr-2 size-4" />
                      Falar no WhatsApp
                    </a>
                  ) : null}
                  <Link
                    href={`/admin/agendamento-manual?date=${formatBrazilDate(appointment.scheduledAt).split("/").reverse().join("-")}&customerName=${encodeURIComponent(appointment.customerName)}&customerPhone=${encodeURIComponent(appointment.customerPhone ?? "")}`}
                    className="inline-flex rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-300/18"
                  >
                    Reagendar cliente
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 px-4 py-6 text-sm text-stone-400">
              Nenhum cliente agendado para essa data.
            </div>
          )}
        </div>
      </section>

      <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Horários do dia</p>
        <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Grade preenchida</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-red-200/80">Ocupados</p>
            <p className="mt-2 text-2xl font-semibold text-red-100">{summary.occupied}</p>
          </div>
          <div className="rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">Bloqueados</p>
            <p className="mt-2 text-2xl font-semibold text-amber-50">{summary.blocked}</p>
          </div>
          <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Livres</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-100">{summary.free}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((slot) => (
            <button
              key={slot.time}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`rounded-[20px] border px-4 py-4 text-left transition ${
                slot.appointment
                  ? "border-red-400/35 bg-red-500/10 hover:bg-red-500/14"
                  : slot.blocked
                    ? "border-amber-300/30 bg-amber-300/10 hover:bg-amber-300/14"
                    : "border-white/10 bg-black/20 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold text-amber-50">{slot.time}</p>
                {slot.appointment ? <Scissors className="mt-0.5 size-4 text-red-200" /> : null}
                {!slot.appointment && slot.blocked ? <LockKeyhole className="mt-0.5 size-4 text-amber-100" /> : null}
                {!slot.appointment && !slot.blocked ? <Clock3 className="mt-0.5 size-4 text-emerald-200" /> : null}
              </div>
              {slot.appointment ? (
                <>
                  <p className="mt-2 text-sm font-medium text-stone-100">{slot.appointment.customerName}</p>
                  <p className="mt-1 text-xs text-stone-300">{slot.appointment.serviceName}</p>
                </>
              ) : slot.blocked ? (
                <p className="mt-2 text-xs uppercase tracking-[0.25em] text-amber-100/80">Bloqueado</p>
              ) : (
                <p className="mt-2 text-xs uppercase tracking-[0.25em] text-stone-400">Livre</p>
              )}
            </button>
          ))}
        </div>

        {selectedSlot ? (
          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200/60">Detalhe do horário</p>
            <p className="mt-2 text-2xl font-semibold text-amber-50">{selectedSlot.time}</p>
            {selectedSlot.appointment ? (
              <div className="mt-3 space-y-3 text-sm text-stone-300">
                <p className="text-base font-medium text-stone-100">{selectedSlot.appointment.customerName}</p>
                <p>{selectedSlot.appointment.serviceName}</p>
                <p>{selectedSlot.appointment.paidLabel}</p>
                {selectedSlot.appointment.amountLabel ? <p>{selectedSlot.appointment.amountLabel}</p> : null}
                {selectedSlot.appointment.customerPhone ? <p>{selectedSlot.appointment.customerPhone}</p> : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedSlot.appointment.customerPhone ? (
                    <a
                      href={buildWhatsAppLink(selectedSlot.appointment.customerPhone, buildFollowUpMessage(selectedSlot.appointment))}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/18"
                    >
                      <MessageCircle className="mr-2 size-4" />
                      Chamar cliente
                    </a>
                  ) : null}
                  <Link
                    href={`/admin/agendamento-manual?date=${formatBrazilDate(selectedSlot.appointment.scheduledAt).split("/").reverse().join("-")}&customerName=${encodeURIComponent(selectedSlot.appointment.customerName)}&customerPhone=${encodeURIComponent(selectedSlot.appointment.customerPhone ?? "")}`}
                    className="inline-flex rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-300/18"
                  >
                    Abrir reagendamento
                  </Link>
                </div>
              </div>
            ) : selectedSlot.blocked ? (
              <p className="mt-3 text-sm text-amber-100">Esse horário está bloqueado para a agenda do dia.</p>
            ) : (
              <p className="mt-3 text-sm text-emerald-200">Esse horário está livre para encaixe.</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
