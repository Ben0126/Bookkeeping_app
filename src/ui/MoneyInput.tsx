import type { Ref } from 'react';
import type { CurrencyCode } from '../core';

/** An amount field led by a bold currency badge, so the currency can't be missed. */
export function MoneyInput({
  id,
  currency,
  value,
  onChange,
  invalidProps,
  inputRef,
  large = false,
  autoFocus = false,
}: {
  id: string;
  currency: CurrencyCode | undefined;
  value: string;
  onChange: (value: string) => void;
  invalidProps: object;
  inputRef?: Ref<HTMLInputElement>;
  large?: boolean;
  autoFocus?: boolean;
}) {
  const invalid = 'aria-invalid' in invalidProps;
  return (
    <div
      className={
        'flex overflow-hidden rounded-lg border bg-white shadow-xs focus-within:ring-2 ' +
        (invalid ? 'border-rose-500 focus-within:ring-rose-500/30' : 'border-slate-300 focus-within:border-indigo-500 focus-within:ring-indigo-500/30')
      }
    >
      <span
        className={
          'flex shrink-0 items-center bg-indigo-600 px-3 font-bold tracking-wide text-white ' +
          (large ? 'text-base' : 'text-sm')
        }
      >
        {currency ?? '—'}
      </span>
      <input
        id={id}
        ref={inputRef}
        className={
          'min-w-0 flex-1 px-3 tabular-nums outline-none placeholder:text-slate-300 ' +
          (large ? 'py-2.5 text-2xl font-semibold' : 'py-2 text-base')
        }
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...invalidProps}
      />
    </div>
  );
}
