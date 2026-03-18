"use client";

import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ServiceCard } from "@/components/service-card";
import { getBookingDurationMinutes } from "@/lib/booking";
import { formatMoney } from "@/lib/format";
import { getQuickWeekDates } from "@/lib/quick-dates";

type ServiceItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  duration_minutes: number;
  price_in_cents: number;
  image_path: string;
};

export function ServiceSelectionForm({
  services,
  initialSelectedIds,
  initialDate,
  barberName,
  blockedFullDayDates,
}: {
  services: ServiceItem[];
  initialSelectedIds: string[];
  initialDate: string;
  barberName: string;
  blockedFullDayDates: string[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [selectedDateValue, setSelectedDateValue] = useState(initialDate);
  const [dateDisplayValue, setDateDisplayValue] = useState(format(parse(initialDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy"));

  const selectedServices = useMemo(
    () => services.filter((service) => selectedIds.includes(service.id)),
    [services, selectedIds],
  );
  const quickDates = useMemo(() => {
    return getQuickWeekDates(new Date()).map((date) => ({
      value: date.iso,
      label: format(date.date, "EEEE", { locale: ptBR }),
      shortDate: format(date.date, "dd/MM"),
    }));
  }, []);

  const totalPriceInCents = selectedServices.reduce((sum, service) => sum + service.price_in_cents, 0);
  const totalDurationMinutes = getBookingDurationMinutes(selectedServices);
  const serviceSummary = selectedServices.map((service) => service.name).join(" + ");
  const isSelectedDateBlocked = blockedFullDayDates.includes(selectedDateValue);

  function handleToggle(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }

      const next = current.filter((item) => item !== id);
      return next.length ? next : [];
    });
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function navigateToSchedule(nextDate: string, nextSelectedIds = selectedIds) {
    const params = new URLSearchParams();
    if (nextSelectedIds.length) {
      params.set("serviceIds", nextSelectedIds.join(","));
    }
    if (nextDate) {
      params.set("date", nextDate);
    }

    router.replace(`/cliente?${params.toString()}#horarios`);
  }

  function updateDateFromIso(isoDate: string) {
    if (blockedFullDayDates.includes(isoDate)) {
      return;
    }
    setSelectedDateValue(isoDate);
    const parsed = parse(isoDate, "yyyy-MM-dd", new Date());
    setDateDisplayValue(isValid(parsed) ? format(parsed, "dd/MM/yyyy") : "");
    if (selectedIds.length) {
      navigateToSchedule(isoDate);
    }
  }

  function updateDateFromDisplay(displayDate: string) {
    setDateDisplayValue(displayDate);
    const parsed = parse(displayDate, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      const isoDate = format(parsed, "yyyy-MM-dd");
      setSelectedDateValue(isoDate);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (selectedIds.length) {
      params.set("serviceIds", selectedIds.join(","));
    }
    if (selectedDateValue) {
      params.set("date", selectedDateValue);
    }

    window.location.href = `/cliente?${params.toString()}#horarios`;
  }

  return (
    <form className="mt-8 space-y-8" method="get" action="/cliente#horarios" onSubmit={handleSubmit}>
      <input type="hidden" name="serviceIds" value={selectedIds.join(",")} />
      <input type="hidden" name="date" value={selectedDateValue} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            id={service.id}
            name={service.name}
            description={service.description}
            durationMinutes={service.duration_minutes}
            priceInCents={service.price_in_cents}
            imagePath={service.image_path}
            checked={selectedIds.includes(service.id)}
            onToggle={handleToggle}
          />
        ))}
      </div>

      <div className="rounded-[22px] border border-amber-300/20 bg-amber-300/8 p-4 sm:rounded-[28px] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">Resumo da escolha</p>
            <p className="mt-3 text-lg text-amber-50">{selectedServices.length} serviço(s) selecionado(s)</p>
            <p className="mt-2 text-sm text-stone-300">{serviceSummary || "Nenhum serviço selecionado ainda."}</p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-red-400/35 hover:bg-red-500/10 hover:text-red-200"
          >
            Limpar serviços
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-white/10 bg-black/15 px-4 py-2 text-stone-200">
            {totalDurationMinutes > 0 ? `Tempo total: ${totalDurationMinutes} minutos` : "Tempo total: não altera horário"}
          </span>
          <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-amber-100">
            Total: {formatMoney(totalPriceInCents)}
          </span>
          <span className="rounded-full border border-emerald-400/35 bg-emerald-400/10 px-4 py-2 text-emerald-200">
            Sinal: {formatMoney(Math.round(totalPriceInCents / 2))}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[22px] border border-white/10 bg-black/15 p-4 sm:rounded-[28px] sm:p-5">
          <label className="block text-sm text-stone-300">Barbeiro</label>
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100">
            {barberName}
          </div>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/15 p-4 sm:rounded-[28px] sm:p-5">
          <label className="block text-sm text-stone-300">Data</label>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {quickDates.map((date) => {
              const isSelected = selectedDateValue === date.value;
              const isBlocked = blockedFullDayDates.includes(date.value);
              return (
                <button
                  key={date.value}
                  type="button"
                  onClick={() => updateDateFromIso(date.value)}
                  disabled={isBlocked}
                  className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    isSelected
                      ? "border-amber-300 bg-amber-300/12 text-amber-100"
                      : isBlocked
                        ? "border-red-500/35 bg-red-500/10 text-red-100"
                        : "border-white/10 bg-black/20 text-stone-200 hover:border-amber-200/35 hover:bg-amber-300/8"
                  }`}
                >
                  <span className={`block text-[10px] uppercase tracking-[0.28em] ${isBlocked ? "text-red-200/80" : "text-amber-200/70"}`}>
                    {date.label}
                  </span>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="block text-base font-semibold">{date.shortDate}</span>
                    {isBlocked ? <X className="size-4 text-red-300" /> : null}
                  </div>
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
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100"
          />
          <p className="mt-2 text-xs text-stone-400">
            Para outros dias, use o calendário acima.
          </p>
          {isSelectedDateBlocked ? (
            <p className="mt-2 text-xs font-medium text-red-300">
              Esse dia está bloqueado pelo barbeiro e não pode ser escolhido pelo cliente.
            </p>
          ) : null}
        </div>
      </div>
      <button
        type="submit"
        disabled={isSelectedDateBlocked}
        className="rounded-2xl bg-amber-300 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-stone-600 disabled:text-stone-200"
      >
        Mostrar horários disponíveis
      </button>
    </form>
  );
}
