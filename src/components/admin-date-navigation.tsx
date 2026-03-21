"use client";

import { addDays, format, parse, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { isSundayDate, normalizeWorkingDate } from "@/lib/quick-dates";

function toBrazilianDate(isoDate: string) {
  return format(new Date(`${isoDate}T12:00:00`), "dd/MM/yyyy");
}

function toWorkingIsoDate(value: Date | string) {
  return format(normalizeWorkingDate(value), "yyyy-MM-dd");
}

export function AdminDateNavigation({
  selectedDate,
  navigationBasePath = "/admin",
  agendaHrefBase = "/admin/agenda",
}: {
  selectedDate: string;
  navigationBasePath?: string;
  agendaHrefBase?: string;
}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(toBrazilianDate(selectedDate));

  const quickDates = useMemo(() => {
    const base = normalizeWorkingDate(selectedDate);
    return [-3, -2, -1, 0, 1, 2, 3]
      .map((offset) => addDays(base, offset))
      .filter((date) => !isSundayDate(date))
      .map((date) => {
      return {
        iso: format(date, "yyyy-MM-dd"),
        weekday: format(date, "EEEE", { locale: ptBR }).toUpperCase(),
        shortDate: format(date, "dd/MM"),
      };
    });
  }, [selectedDate]);

  function goToDate(isoDate: string) {
    router.replace(`${navigationBasePath}?date=${toWorkingIsoDate(isoDate)}`);
  }

  function shiftDay(direction: "prev" | "next") {
    let nextDate = new Date(`${selectedDate}T12:00:00`);

    do {
      nextDate = direction === "prev" ? subDays(nextDate, 1) : addDays(nextDate, 1);
    } while (isSundayDate(nextDate));

    goToDate(format(nextDate, "yyyy-MM-dd"));
  }

  function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
    if (Number.isNaN(parsed.getTime())) return;
    router.push(`${agendaHrefBase}?date=${toWorkingIsoDate(parsed)}`);
  }

  return (
    <div className="flex flex-col gap-4 lg:items-end">
      <div className="flex items-center gap-2 self-start lg:self-auto">
        <button
          type="button"
          onClick={() => shiftDay("prev")}
          className="rounded-full border border-white/10 bg-white/[0.04] p-3 text-stone-100 transition hover:border-amber-300/40 hover:bg-amber-300/10"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => goToDate(format(new Date(), "yyyy-MM-dd"))}
          className="rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/16"
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => shiftDay("next")}
          className="rounded-full border border-white/10 bg-white/[0.04] p-3 text-stone-100 transition hover:border-amber-300/40 hover:bg-amber-300/10"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {quickDates.map((date) => {
          const isSelected = date.iso === selectedDate;
          return (
            <button
              key={date.iso}
              type="button"
              onClick={() => goToDate(date.iso)}
              className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                isSelected
                  ? "border-amber-300 bg-amber-300/12 text-amber-100"
                  : "border-white/10 bg-black/20 text-stone-200 hover:border-amber-200/35 hover:bg-amber-300/8"
              }`}
            >
              <span className="block text-[10px] uppercase tracking-[0.28em] text-amber-200/70">
                {date.weekday}
              </span>
              <span className="mt-1 block text-base font-semibold">{date.shortDate}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="block text-sm text-stone-300">Escolher data</label>
          <input
            name="date"
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="dd/mm/aaaa"
            className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-stone-100 placeholder:text-stone-500"
          />
        </div>
        <button type="submit" className="rounded-[18px] bg-amber-300 px-5 py-3 font-semibold text-stone-950 transition hover:bg-amber-200">
          Ver agenda
        </button>
      </form>
    </div>
  );
}
