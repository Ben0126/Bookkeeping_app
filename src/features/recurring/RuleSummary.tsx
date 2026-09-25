import type { Account, Category, RecurringRule } from '../../core';
import { useFormat } from '../../ui/useFormat';

/** Icon, category, payee and account of a rule, with its amount. */
export function RuleSummary({
  rule,
  account,
  category,
  details,
}: {
  rule: RecurringRule;
  account: Account | undefined;
  category: Category | undefined;
  /** Shown before the payee and account, e.g. the due date. */
  details?: string;
}) {
  const fmt = useFormat();
  const { template } = rule;
  const signed = template.kind === 'income' || template.refund ? template.amountMinor : -template.amountMinor;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl" aria-hidden="true">
        {category?.icon ?? (template.kind === 'income' ? '💰' : '🏷️')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900">{fmt.categoryName(category)}</span>
        <span className="block truncate text-sm text-slate-500">
          {[details, template.payee, account?.name ?? '?'].filter(Boolean).join(' · ')}
        </span>
      </span>
      {account && (
        <span className={`shrink-0 font-semibold tabular-nums ${signed > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900'}`}>
          {fmt.signedMoney(signed, account.currency)}
        </span>
      )}
    </div>
  );
}
