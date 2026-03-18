"use client";

import { formatMoney } from "@/lib/format";

type Props = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceInCents: number;
  imagePath: string;
  selected?: boolean;
  checked?: boolean;
  onToggle?: (id: string, checked: boolean) => void;
};

export function ServiceCard(props: Props) {
  return (
    <label className="group block cursor-pointer">
      <input
        className="peer sr-only"
        type="checkbox"
        name="serviceId"
        value={props.id}
        checked={props.checked ?? props.selected ?? false}
        onChange={(event) => props.onToggle?.(props.id, event.currentTarget.checked)}
      />
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5 transition duration-300 peer-checked:border-amber-300 peer-checked:bg-amber-300/10 hover:-translate-y-1 hover:border-amber-200/50">
        <div className="relative h-32 overflow-hidden bg-black sm:h-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.imagePath}
            alt={props.name}
            loading="lazy"
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
            style={{ objectPosition: "center center" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-amber-50">{props.name}</h3>
            <span className="rounded-full bg-amber-300/20 px-3 py-1 text-sm text-amber-100">
              {formatMoney(props.priceInCents)}
            </span>
          </div>
        </div>
      </div>
    </label>
  );
}
