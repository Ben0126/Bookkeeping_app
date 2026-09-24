import type { Backup } from '../../core';
import { readPreference, removePreference, writePreference } from '../../ui/preferences';

const DAY = 24 * 60 * 60 * 1000;

/** Unbacked changes older than this bring up the reminder. */
export const REMIND_AFTER_MS = 7 * DAY;
/** How long "Remind me later" hides the reminder. */
export const SNOOZE_MS = 3 * DAY;

/** Backups larger than this are refused before reading, to keep the page responsive. */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

/** "studybudget-2026-09-24-1530.json": sorts by time and rarely collides. */
export function backupFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `studybudget-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}.json`
  );
}

/** The backup as a file, stamped with the time it was saved. */
export function toBackupFile(backup: Backup, now: Date): File {
  const stamped: Backup = { ...backup, exportedAt: now.toISOString() };
  return new File([JSON.stringify(stamped, null, 2)], backupFileName(now), { type: 'application/json' });
}

export function shouldRemindBackup({
  oldestUnbackedAt,
  snoozedUntil,
  now,
}: {
  oldestUnbackedAt: number | undefined;
  snoozedUntil: number | undefined;
  now: number;
}): boolean {
  if (oldestUnbackedAt === undefined) return false;
  if (snoozedUntil !== undefined && now < snoozedUntil) return false;
  return now - oldestUnbackedAt >= REMIND_AFTER_MS;
}

// Per-device state: a backup file protects this device's data, so these
// live in localStorage rather than in the ledger (and are not in backups).
const LAST_BACKUP = 'lastBackupAt';
const SNOOZED_UNTIL = 'backupReminderSnoozedUntil';

function readTime(key: string): number | undefined {
  const value = Number(readPreference(key) ?? Number.NaN);
  return Number.isFinite(value) ? value : undefined;
}

export const readLastBackupAt = () => readTime(LAST_BACKUP);
export const writeLastBackupAt = (time: number | undefined) =>
  time === undefined ? removePreference(LAST_BACKUP) : writePreference(LAST_BACKUP, String(time));
export const readSnoozedUntil = () => readTime(SNOOZED_UNTIL);
export const writeSnoozedUntil = (time: number) => writePreference(SNOOZED_UNTIL, String(time));
