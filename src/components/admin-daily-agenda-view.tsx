"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AgendaAppointment = {
  id: string;
  customerName: string;
  serviceName: string;
  scheduledAt: string;
  paidLabel: string;
};

type AgendaSlot = {
  time: string;
  appointment?: AgendaAppointment;
  blocked?: boolean;
};

export function AdminDailyAgendaView({
  appointments,
  slots,
}: {
  appointments: AgendaAppointment[];
  slots: AgendaSlot[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_1.2fr]">
      <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Clientes agendados</p>
        <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Agenda do dia</h2>
        <div className="mt-5 space-y-3">
          {appointments.length ? (
            appointments.map((appointment) => (
              <article key={appointment.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-amber-50">{appointment.customerName}</p>
                    <p className="mt-1 text-sm text-stone-300">{appointment.serviceName}</p>
                    <p className="mt-2 text-sm text-stone-400">
                      {format(new Date(appointment.scheduledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100">
                    {appointment.paidLabel}
                  </span>
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
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((slot) => (
            <div
              key={slot.time}
              className={`rounded-[20px] border px-4 py-4 ${
                slot.appointment
                  ? "border-red-400/35 bg-red-500/10"
                  : slot.blocked
                    ? "border-amber-300/30 bg-amber-300/10"
                    : "border-white/10 bg-black/20"
              }`}
            >
              <p className="text-lg font-semibold text-amber-50">{slot.time}</p>
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
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
