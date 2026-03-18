"use client";

import { addMinutes, format, isSameDay, isValid, parse, parseISO, setHours, setMinutes, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import type { BlockedSlotRecord } from "@/lib/db";
import { getQuickWeekDates } from "@/lib/quick-dates";

export function AdminBlockForms({
  barberName,
  initialDate,
  blockedSlots,
}: {
  barberName: string;
  initialDate: string;
  blockedSlots: BlockedSlotRecord[];
}) {
  const [selectedDateValue, setSelectedDateValue] = useState(initialDate);
  const [dateDisplayValue, setDateDisplayValue] = useState(initialDate);
  const [startTimeValue, setStartTimeValue] = useState("09:00");
  const [endTimeValue, setEndTimeValue] = useState("09:30");

  const quickDates = useMemo(() => {
    return getQuickWeekDates(new Date()).map((date) => ({
      value: date.br,
      label: format(date.date, "EEEE", { locale: ptBR }),
      shortDate: format(date.date, "dd/MM"),
    }));
  }, []);

  const timeOptions = useMemo(() => {
    const options: string[] = [];
    let cursor = setMinutes(setHours(startOfDay(new Date()), 9), 0);
    const finish = setMinutes(setHours(startOfDay(new Date()), 20), 0);

    while (cursor <= finish) {
      options.push(format(cursor, "HH:mm"));
      cursor = addMinutes(cursor, 30);
    }

    return options;
  }, []);

  const allDayBlockedDates = useMemo(() => {
    return new Set(
      blockedSlots
        .filter((slot) => {
          const startsAt = parseISO(slot.starts_at);
          const endsAt = parseISO(slot.ends_at);
          return format(startsAt, "HH:mm") === "00:00" && format(endsAt, "HH:mm") === "23:59";
        })
        .map((slot) => format(parseISO(slot.starts_at), "dd/MM/yyyy")),
    );
  }, [blockedSlots]);

  const selectedDayBlocks = useMemo(
    () => blockedSlots.filter((slot) => isSameDay(parseISO(slot.starts_at), parse(dateDisplayValue, "dd/MM/yyyy", new Date()))),
    [blockedSlots, dateDisplayValue],
  );
  const orderedBlockedSlots = useMemo(() => {
    const selectedDate = parse(dateDisplayValue, "dd/MM/yyyy", new Date());
    return [...blockedSlots].sort((a, b) => {
      const aDate = parseISO(a.starts_at);
      const bDate = parseISO(b.starts_at);
      const aSelected = isValid(selectedDate) && isSameDay(aDate, selectedDate) ? 0 : 1;
      const bSelected = isValid(selectedDate) && isSameDay(bDate, selectedDate) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return aDate.getTime() - bDate.getTime();
    });
  }, [blockedSlots, dateDisplayValue]);

  function updateDate(displayDate: string) {
    setDateDisplayValue(displayDate);
    const parsed = parse(displayDate, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      setSelectedDateValue(format(parsed, "dd/MM/yyyy"));
    }
  }

  function handleStartTimeChange(value: string) {
    setStartTimeValue(value);
    if (value >= endTimeValue) {
      const currentIndex = timeOptions.indexOf(value);
      setEndTimeValue(timeOptions[Math.min(currentIndex + 1, timeOptions.length - 1)] ?? value);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Fechamento</p>
        <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Bloquear o dia inteiro</h2>
        <p className="mt-2 text-sm text-stone-300">Escolha dia, mês e ano para fechar toda a agenda.</p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quickDates.map((date) => {
            const isSelected = dateDisplayValue === date.value;
            return (
              <button
                key={date.value}
                type="button"
                onClick={() => updateDate(date.value)}
                className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                  isSelected
                    ? "border-amber-300 bg-amber-300/12 text-amber-100"
                    : allDayBlockedDates.has(date.value)
                      ? "border-red-400/45 bg-red-500/10 text-red-100 hover:border-red-300/70 hover:bg-red-500/15"
                    : "border-white/10 bg-black/20 text-stone-200 hover:border-amber-200/35 hover:bg-amber-300/8"
                }`}
              >
                <span className={`block text-[10px] uppercase tracking-[0.28em] ${allDayBlockedDates.has(date.value) ? "text-red-200/80" : "text-amber-200/70"}`}>
                  {date.label}
                </span>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="block text-base font-semibold">{date.shortDate}</span>
                  {allDayBlockedDates.has(date.value) ? <span className="text-sm font-bold text-red-300">X</span> : null}
                </div>
              </button>
            );
          })}
        </div>

        <form action="/api/admin/blocks/day" method="post" className="mt-6 grid gap-4">
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-stone-100">{barberName}</div>
          <input type="hidden" name="date" value={selectedDateValue} />
          <input
            type="text"
            inputMode="numeric"
            value={dateDisplayValue}
            onChange={(event) => updateDate(event.target.value)}
            placeholder="dd/mm/aaaa"
            className="w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
            required
          />
          <input
            name="reason"
            placeholder="Motivo do fechamento do dia"
            className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
          />
          <button type="submit" className="rounded-[18px] bg-amber-300 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-200">
            Fechar dia selecionado
          </button>
        </form>
      </section>

      <section className="glass rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Horário específico</p>
        <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Bloquear um período do dia</h2>
        <p className="mt-2 text-sm text-stone-300">Ideal para fechar da metade do dia em diante, antes do almoço ou qualquer intervalo que você quiser.</p>

        <form action="/api/admin/blocks/period" method="post" className="mt-6 grid gap-4">
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-stone-100">{barberName}</div>
          <input type="hidden" name="date" value={selectedDateValue} />
          <input
            type="text"
            inputMode="numeric"
            value={dateDisplayValue}
            onChange={(event) => updateDate(event.target.value)}
            placeholder="dd/mm/aaaa"
            className="w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <select
              name="startTime"
              value={startTimeValue}
              onChange={(event) => handleStartTimeChange(event.target.value)}
              className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-stone-100"
              required
            >
              {timeOptions.slice(0, -1).map((time) => (
                <option key={time} value={time} className="bg-stone-950">
                  {time}
                </option>
              ))}
            </select>
            <select
              name="endTime"
              value={endTimeValue}
              onChange={(event) => setEndTimeValue(event.target.value)}
              className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-stone-100"
              required
            >
              {timeOptions
                .filter((time) => time > startTimeValue)
                .map((time) => (
                  <option key={time} value={time} className="bg-stone-950">
                    {time}
                  </option>
                ))}
            </select>
          </div>

          <input
            name="reason"
            placeholder="Motivo do bloqueio desse horário"
            className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
          />
          <button type="submit" className="rounded-[18px] border border-red-400/45 bg-red-500/80 px-4 py-3 font-semibold text-white transition hover:bg-red-500">
            Fechar horário selecionado
          </button>
        </form>
      </section>

      <section className="glass rounded-[24px] p-4 sm:col-span-2 sm:rounded-[30px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.45em] text-amber-200/60">Bloqueios ativos</p>
        <h2 className="mt-3 text-2xl text-amber-50 sm:text-3xl">Dias e horários fechados</h2>
        <p className="mt-2 text-sm text-stone-300">
          Aqui você vê o que já foi bloqueado e pode desbloquear qualquer dia ou horário quando quiser.
        </p>

        <div className="mt-5 grid gap-4">
          {orderedBlockedSlots.length ? (
            orderedBlockedSlots.map((slot) => {
              const startsAt = parseISO(slot.starts_at);
              const endsAt = parseISO(slot.ends_at);
              const isAllDay = format(startsAt, "HH:mm") === "00:00" && format(endsAt, "HH:mm") === "23:59";
              const isSelectedDay = selectedDayBlocks.some((selectedSlot) => selectedSlot.id === slot.id);

              return (
                <article
                  key={slot.id}
                  className={`rounded-[22px] border p-4 ${
                    isSelectedDay
                      ? "border-amber-300/30 bg-amber-300/10"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.35em] text-amber-200/65">
                        {isAllDay ? "Dia inteiro bloqueado" : "Horário bloqueado"}
                      </p>
                      <h3 className="text-lg font-semibold text-amber-50">
                        {format(startsAt, "dd/MM/yyyy")} {format(startsAt, "EEEE", { locale: ptBR })}
                      </h3>
                      <div className="flex flex-wrap gap-2 text-sm text-stone-200">
                        <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-red-100">
                          {isAllDay ? "Fechado o dia todo" : `${format(startsAt, "HH:mm")} até ${format(endsAt, "HH:mm")}`}
                        </span>
                        {slot.reason ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-stone-300">{slot.reason}</span>
                        ) : null}
                      </div>
                    </div>

                    <form action="/api/admin/blocks/remove" method="post">
                      <input type="hidden" name="blockId" value={slot.id} />
                      <input type="hidden" name="date" value={dateDisplayValue} />
                      <button
                        type="submit"
                        className="rounded-[18px] border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                      >
                        Tirar bloqueio
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 px-4 py-6 text-sm text-stone-400">
              Nenhum bloqueio ativo encontrado. Quando você fechar um dia ou horário, ele vai aparecer aqui para você poder desfazer depois.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
