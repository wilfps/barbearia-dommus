type Props = {
  label: string;
  value: string;
  helper: string;
};

export function StatCard({ label, value, helper }: Props) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[28px] sm:p-5">
      <p className="text-sm text-stone-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-amber-50 sm:mt-3 sm:text-3xl">{value}</p>
      <p className="mt-2 text-sm text-stone-300">{helper}</p>
    </div>
  );
}
