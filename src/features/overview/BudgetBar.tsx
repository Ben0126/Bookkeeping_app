/** How much of a budget is used: indigo, amber past 80%, rose once over. */
export function BudgetBar({ spentMinor, limitMinor, thin = false }: { spentMinor: number; limitMinor: number; thin?: boolean }) {
  const ratio = limitMinor > 0 ? spentMinor / limitMinor : 1;
  const color = ratio > 1 ? 'bg-rose-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-indigo-500';
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
      className={`overflow-hidden rounded-full bg-slate-100 ${thin ? 'h-1.5' : 'h-2.5'}`}
    >
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
    </div>
  );
}
