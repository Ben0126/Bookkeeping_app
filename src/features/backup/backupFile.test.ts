import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, BACKUP_VERSION, readBackup, type Backup } from '../../core';
import {
  backupFileName,
  readLastBackupAt,
  REMIND_AFTER_MS,
  shouldRemindBackup,
  toBackupFile,
  writeLastBackupAt,
} from './backupFile';

const empty: Backup = {
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedAt: '2000-01-01T00:00:00.000Z',
  data: { accounts: [], categories: [], transactions: [], exchangeRates: [], budgets: [], settings: [] },
};

describe('backup files', () => {
  it('names files by local date and time', () => {
    expect(backupFileName(new Date(2026, 8, 4, 7, 5))).toBe('studybudget-2026-09-04-0705.json');
  });

  it('stamps the save time and stays readable as a backup', async () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    const file = toBackupFile(empty, now);
    expect(file.type).toBe('application/json');
    const parsed = readBackup(await file.text());
    expect(parsed.exportedAt).toBe('2026-09-24T12:00:00.000Z');
  });
});

describe('shouldRemindBackup', () => {
  const now = 100 * REMIND_AFTER_MS;

  it('stays quiet without unbacked changes or while they are recent', () => {
    expect(shouldRemindBackup({ oldestUnbackedAt: undefined, snoozedUntil: undefined, now })).toBe(false);
    expect(shouldRemindBackup({ oldestUnbackedAt: now - REMIND_AFTER_MS + 1, snoozedUntil: undefined, now })).toBe(false);
  });

  it('reminds once changes have gone unbacked for a week', () => {
    expect(shouldRemindBackup({ oldestUnbackedAt: now - REMIND_AFTER_MS, snoozedUntil: undefined, now })).toBe(true);
  });

  it('respects a snooze until it runs out', () => {
    const old = now - 2 * REMIND_AFTER_MS;
    expect(shouldRemindBackup({ oldestUnbackedAt: old, snoozedUntil: now + 1, now })).toBe(false);
    expect(shouldRemindBackup({ oldestUnbackedAt: old, snoozedUntil: now, now })).toBe(true);
  });
});

describe('last backup preference', () => {
  it('round-trips and ignores garbage', () => {
    expect(readLastBackupAt()).toBeUndefined();
    writeLastBackupAt(1234);
    expect(readLastBackupAt()).toBe(1234);
    localStorage.setItem('studybudget.lastBackupAt', 'nope');
    expect(readLastBackupAt()).toBeUndefined();
  });
});
