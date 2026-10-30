import type { TFunction } from 'i18next';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  defaultCategoryRecords,
  exchangeRateId,
  monthOf,
  shiftMonth,
  type Account,
  type Backup,
  type ExchangeRate,
  type RecurringRule,
  type Transaction,
} from '../../core';

/** Names shown in the sample data, in the interface language. */
export interface DemoNames {
  cash: string;
  localBank: string;
  homeBank: string;
  homeCard: string;
  landlord: string;
  partTimeJob: string;
  friendPaidBack: string;
}

/** The sample's names in the interface language. */
export function demoNames(t: TFunction): DemoNames {
  return {
    cash: t('demo.names.cash'),
    localBank: t('demo.names.localBank'),
    homeBank: t('demo.names.homeBank'),
    homeCard: t('demo.names.homeCard'),
    landlord: t('demo.names.landlord'),
    partTimeJob: t('demo.names.partTimeJob'),
    friendPaidBack: t('demo.names.friendPaidBack'),
  };
}

/** How many months before the current one the sample covers: a full semester and then some. */
const MONTHS_BEFORE = 6;
const DAY_MS = 86_400_000;

const CASH = 'demo-cash';
const SUICA = 'demo-suica';
const LOCAL_BANK = 'demo-local-bank';
const HOME_BANK = 'demo-home-bank';
const HOME_CARD = 'demo-home-card';

type Range = readonly [number, number];
const MEALS: readonly [string, Range][] = [
  ['松屋', [580, 890]],
  ['すき家', [480, 780]],
  ['学食', [420, 560]],
  ['一蘭', [980, 1290]],
  ['スターバックス', [480, 690]],
  ['セブンイレブン', [300, 700]],
];
const GROCERIES: readonly [string, Range][] = [
  ['まいばすけっと', [1200, 2800]],
  ['イオン', [2500, 5200]],
  ['業務スーパー', [1800, 3600]],
];
const TRAINS: readonly [string, Range][] = [
  ['JR東日本', [180, 560]],
  ['東京メトロ', [180, 330]],
];
const CARD_SHOPPING: readonly [string, Range][] = [
  ['ユニクロ', [1990, 5990]],
  ['Amazon', [1200, 6800]],
  ['無印良品', [800, 3500]],
];
const OUTINGS: readonly [string, Range][] = [
  ['カラオケ', [1100, 1800]],
  ['TOHOシネマズ', [1900, 2000]],
];

/**
 * A Taiwanese student's last six months or so in Tokyo, up to `today`: cash
 * and a Suica card for daily spending, a Japanese bank for rent and a
 * part-time job, money sent from home, and a Taiwanese card used in yen. The
 * same `today` always gives the same data. Loaded like a backup, so it is
 * validated the same way.
 */
export function buildDemoBackup({ today, names, now }: { today: string; names: DemoNames; now: number }): Backup {
  const random = seededRandom(2026);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  const yen = ([low, high]: Range) => Math.round((low + random() * (high - low)) / 10) * 10;
  const stamps = { createdAt: now, updatedAt: now };

  const account = (fields: Pick<Account, 'id' | 'name' | 'kind' | 'currency' | 'openingBalanceMinor' | 'foreignFeeBps'>): Account => ({
    ...fields,
    archived: false,
    ...stamps,
  });
  const accounts: Account[] = [
    account({ id: CASH, name: names.cash, kind: 'cash', currency: 'JPY', openingBalanceMinor: 20000 }),
    account({ id: SUICA, name: 'Suica', kind: 'e_wallet', currency: 'JPY', openingBalanceMinor: 2000 }),
    account({ id: LOCAL_BANK, name: names.localBank, kind: 'bank', currency: 'JPY', openingBalanceMinor: 180000 }),
    account({ id: HOME_BANK, name: names.homeBank, kind: 'bank', currency: 'TWD', openingBalanceMinor: 120000 }),
    account({ id: HOME_CARD, name: names.homeCard, kind: 'credit_card', currency: 'TWD', openingBalanceMinor: 0, foreignFeeBps: 150 }),
  ];

  const balances = new Map(accounts.map((a) => [a.id, a.openingBalanceMinor]));
  const transactions: Transaction[] = [];
  let seq = 0;
  const post = (record: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    transactions.push({ id: `demo-${++seq}`, ...record, ...stamps });
    balances.set(record.accountId, (balances.get(record.accountId) ?? 0) + record.amountMinor);
  };
  const spend = (date: string, accountId: string, amount: number, category: string, payee?: string) =>
    post({ kind: 'expense', accountId, amountMinor: -amount, date, categoryId: `default-${category}`, ...(payee && { payee }) });
  const earn = (date: string, accountId: string, amount: number, category: string, payee?: string) =>
    post({ kind: 'income', accountId, amountMinor: amount, date, categoryId: `default-${category}`, ...(payee && { payee }) });
  const transfer = (date: string, from: string, to: string, out: number, into: number) => {
    const transferId = `demo-transfer-${seq + 1}`;
    post({ kind: 'transfer', accountId: from, amountMinor: -out, date, transferId });
    post({ kind: 'transfer', accountId: to, amountMinor: into, date, transferId });
  };

  // Yen per Taiwan dollar, drifting a little from day to day.
  const rates: ExchangeRate[] = [];
  const rateOn = new Map<string, number>();
  // Paid in yen with the Taiwanese card: the charge in TWD includes its 1.5% fee.
  const payByCard = (date: string, amountYen: number, category: string, payee: string, estimated: boolean) => {
    const converted = Math.round(amountYen / rateOn.get(date)!);
    const fee = Math.round(converted * 0.015);
    post({
      kind: 'expense',
      accountId: HOME_CARD,
      amountMinor: -(converted + fee),
      feeMinor: -fee,
      originalAmountMinor: -amountYen,
      originalCurrency: 'JPY',
      date,
      categoryId: `default-${category}`,
      payee,
      ...(estimated && { estimated: true as const }),
    });
  };
  // Keeps cash and Suica from running out, the way people actually top them up.
  const withdrawIfLow = (date: string) => {
    if (balances.get(CASH)! < 8000) transfer(date, LOCAL_BANK, CASH, 20000, 20000);
    if (balances.get(SUICA)! < 1000) transfer(date, CASH, SUICA, 3000, 3000);
  };

  const firstMonth = shiftMonth(monthOf(today), -MONTHS_BEFORE);
  const start = Date.UTC(Number(firstMonth.slice(0, 4)), Number(firstMonth.slice(5, 7)) - 1, 1);
  const end = Date.parse(`${today}T00:00:00Z`);
  const rentPaid: string[] = [];
  const phonePaid: string[] = [];

  for (let time = start, index = 0; time <= end; time += DAY_MS, index += 1) {
    const day = new Date(time);
    const date = day.toISOString().slice(0, 10);
    const dayOfMonth = day.getUTCDate();
    const month = monthOf(date);
    const monthsAgo = monthNumber(monthOf(today)) - monthNumber(month);
    const rate = Math.round((4.6 + 0.12 * Math.sin(index / 19)) * 10000) / 10000;
    rateOn.set(date, rate);
    rates.push({ id: exchangeRateId('TWD', 'JPY', date), from: 'TWD', to: 'JPY', rate, date, updatedAt: now });

    // Monthly: rent, family support sent over, bills, the part-time job's pay.
    if (dayOfMonth === 1) {
      spend(date, LOCAL_BANK, 62000, 'rent', names.landlord);
      rentPaid.push(month);
    }
    if (dayOfMonth === 5) earn(date, HOME_BANK, 25000, 'allowance');
    if (dayOfMonth === 6) {
      transfer(date, HOME_BANK, LOCAL_BANK, 20000, Math.floor((20000 * rate) / 100) * 100);
      spend(date, HOME_BANK, 350, 'fees');
    }
    // The card bill, paid from the Taiwanese bank.
    if (dayOfMonth === 10 && balances.get(HOME_CARD)! < 0) {
      const owed = -balances.get(HOME_CARD)!;
      transfer(date, HOME_BANK, HOME_CARD, owed, owed);
    }
    if (dayOfMonth === 15) {
      spend(date, LOCAL_BANK, 1078, 'phone_internet', '楽天モバイル');
      phonePaid.push(month);
      spend(date, LOCAL_BANK, yen([4800, 7200]), 'utilities', pick(['東京電力', '東京ガス']));
    }
    if (dayOfMonth === 20) spend(date, LOCAL_BANK, 1800, 'insurance', '国民健康保険');
    if (dayOfMonth === 25) earn(date, LOCAL_BANK, yen([38000, 46000]), 'part_time', names.partTimeJob);

    withdrawIfLow(date);

    // Every day: meals, trains, now and then groceries, shopping and a night out.
    if (random() < 0.85) {
      const [payee, range] = pick(MEALS);
      spend(date, random() < 0.7 ? CASH : SUICA, yen(range), 'dining', payee);
    }
    if (random() < 0.5) {
      const [payee, range] = pick(TRAINS);
      spend(date, SUICA, yen(range), 'transport', payee);
    }
    if (index % 3 === 0) {
      const [payee, range] = pick(GROCERIES);
      spend(date, random() < 0.5 ? CASH : LOCAL_BANK, yen(range), 'groceries', payee);
    }
    if (random() < 0.15) {
      const [payee, range] = pick(CARD_SHOPPING);
      // The most recent charges haven't been checked against the statement yet.
      payByCard(date, yen(range), 'shopping', payee, end - time < 14 * DAY_MS);
    }
    if (day.getUTCDay() === 6 && random() < 0.6) {
      const [payee, range] = pick(OUTINGS);
      spend(date, CASH, yen(range), 'entertainment', payee);
    }

    // Once-off: textbooks, a clinic visit, a trip, and a friend paying back dinner.
    if (dayOfMonth === 8 && (month.endsWith('-04') || month.endsWith('-10'))) {
      spend(date, CASH, 6800, 'books_supplies', '紀伊國屋書店');
    }
    if (monthsAgo === 4 && dayOfMonth === 9) spend(date, CASH, 1500, 'health', 'クリニック');
    if (monthsAgo === 3 && dayOfMonth === 12) payByCard(date, 14170, 'travel', 'JR東海', false);
    if (monthsAgo === 1 && dayOfMonth === 18) {
      post({ kind: 'expense', accountId: CASH, amountMinor: 1500, date, categoryId: 'default-dining', payee: names.friendPaidBack });
    }
    withdrawIfLow(date);
  }

  const recurring: RecurringRule[] = [
    {
      id: 'demo-rent',
      template: { kind: 'expense', accountId: LOCAL_BANK, amountMinor: 62000, categoryId: 'default-rent', payee: names.landlord },
      dayOfMonth: 1,
      startMonth: firstMonth,
      ...(rentPaid.length > 0 && { lastMonth: rentPaid[rentPaid.length - 1] }),
      ...stamps,
    },
    {
      id: 'demo-phone',
      template: { kind: 'expense', accountId: LOCAL_BANK, amountMinor: 1078, categoryId: 'default-phone_internet', payee: '楽天モバイル' },
      dayOfMonth: 15,
      startMonth: firstMonth,
      ...(phonePaid.length > 0 && { lastMonth: phonePaid[phonePaid.length - 1] }),
      ...stamps,
    },
  ];

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    data: {
      accounts,
      categories: defaultCategoryRecords(now),
      transactions,
      exchangeRates: rates,
      budgets: [{ id: 'overall', amountMinor: 160000, currency: 'JPY', ...stamps }],
      settings: [
        { key: 'baseCurrency', value: 'TWD' },
        // Japanese universities start the year in April.
        { key: 'semesterStart', value: 4 },
        { key: 'demo', value: true },
      ],
      recurring,
    },
  };
}

function monthNumber(month: string): number {
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7));
}

/** Small deterministic generator (mulberry32), so the sample is the same every time. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
