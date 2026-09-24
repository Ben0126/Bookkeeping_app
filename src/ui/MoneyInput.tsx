import type { Ref } from 'react';
import type { CurrencyCode } from '../core';
import { ChevronDownIcon } from './icons';

/**
 * An amount field led by a bold currency badge, so the currency can't be
 * missed. Given `currencies`, the badge is a picker (e.g. to pay in yen with
 * a Taiwanese card).
 */
export function MoneyInput({
  id,
  currency,
  value,
  onChange,
  invalidProps,
  inputRef,
  large = false,
  autoFocus = false,
  currencies,
  onCurrencyChange,
  currencyLabel,
}: {
  id: string;
  currency: CurrencyCode | undefined;
  value: string;
  onChange: (value: string) => void;
  invalidProps: object;
  inputRef?: Ref<HTMLInputElement>;
  large?: boolean;
  autoFocus?: boolean;
  currencies?: readonly CurrencyCode[];
  onCurrencyChange?: (currency: CurrencyCode) => void;
  /** Accessible name of the currency picker. */
  currencyLabel?: string;
}) {
  const invalid = 'aria-invalid' in invalidProps;
  const badgeText = large ? 'text-base' : 'text-sm';
  return (
    <div
      className={
        'flex overflow-hidden rounded-lg border bg-white shadow-xs focus-within:ring-2 ' +
        (invalid ? 'border-rose-500 focus-within:ring-rose-500/30' : 'border-slate-300 focus-within:border-indigo-500 focus-within:ring-indigo-500/30')
      }
    >
      {currency && currencies && onCurrencyChange ? (
        <span className="relative flex shrink-0 bg-indigo-600 text-white">
          <select
            aria-label={currencyLabel}
            className={`cursor-pointer appearance-none bg-transparent py-0 pr-7 pl-3 font-bold tracking-wide outline-none focus-visible:bg-indigo-700 ${badgeText}`}
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
          >
            {currencies.map((code) => (
              <option key={code} value={code} className="text-slate-900">
                {code}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2" />
        </span>
      ) : (
        <span className={`flex shrink-0 items-center bg-indigo-600 px-3 font-bold tracking-wide text-white ${badgeText}`}>
          {currency ?? '—'}
        </span>
      )}
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
