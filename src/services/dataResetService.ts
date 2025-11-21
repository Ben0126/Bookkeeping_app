import { db } from '../db';

/**
 * Service to handle data reset functionality
 */
export class DataResetService {
    /**
     * Reset all application data
     * This will clear all tables in the database and remove local storage items
     */
    static async resetAllData(): Promise<void> {
        try {
            // Clear all tables
            await db.transaction('rw', db.accounts, db.transactions, db.categories, db.merchantRules, async () => {
                await db.accounts.clear();
                await db.transactions.clear();
                await db.categories.clear();
                await db.merchantRules.clear();
            });

            // Clear local storage (except for some settings if needed, but user asked for full reset)
            // We might want to keep language settings or "installed" status
            const language = localStorage.getItem('i18nextLng');
            const pwaInstalled = localStorage.getItem('pwa_installed');

            localStorage.clear();

            // Restore essential settings
            if (language) localStorage.setItem('i18nextLng', language);
            if (pwaInstalled) localStorage.setItem('pwa_installed', pwaInstalled);

            console.log('All data has been reset successfully');
        } catch (error) {
            console.error('Failed to reset data:', error);
            throw error;
        }
    }
}
