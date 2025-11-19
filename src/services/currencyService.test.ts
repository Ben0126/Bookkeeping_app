import { describe, it, expect } from 'vitest';
import { CurrencyService } from './currencyService';

describe('CurrencyService', () => {
    describe('getCurrencyInfo', () => {
        it('should return correct info for USD', () => {
            const info = CurrencyService.getCurrencyInfo('USD');
            expect(info).toEqual({
                code: 'USD',
                name: 'US Dollar',
                symbol: '$',
                decimalPlaces: 2,
                country: 'United States',
            });
        });

        it('should return correct info for TWD', () => {
            const info = CurrencyService.getCurrencyInfo('TWD');
            expect(info).toEqual({
                code: 'TWD',
                name: 'Taiwan Dollar',
                symbol: 'NT$',
                decimalPlaces: 0,
                country: 'Taiwan',
            });
        });
    });

    describe('formatCurrency', () => {
        it('should format USD correctly', () => {
            const result = CurrencyService.formatCurrency(1234.56, 'USD', 'en-US');
            // Note: The exact output depends on the environment's Intl implementation, 
            // but usually it is "$1,234.56"
            expect(result).toContain('$');
            expect(result).toContain('1,234.56');
        });

        it('should format TWD correctly (no decimals)', () => {
            const result = CurrencyService.formatCurrency(1234, 'TWD', 'zh-TW');
            // Symbol might vary by environment (NT$ or $)
            expect(result).toContain('1,234');
            expect(result).not.toContain('.00');
        });

        it('should respect locale', () => {
            // German uses comma for decimal separator
            const result = CurrencyService.formatCurrency(1234.56, 'EUR', 'de-DE');
            expect(result).toContain('1.234,56'); // or 1 234,56 depending on exact locale version
            expect(result).toContain('€');
        });
    });

    describe('isSupportedCurrency', () => {
        it('should return true for supported currencies', () => {
            expect(CurrencyService.isSupportedCurrency('USD')).toBe(true);
            expect(CurrencyService.isSupportedCurrency('TWD')).toBe(true);
        });

        it('should return false for unsupported currencies', () => {
            expect(CurrencyService.isSupportedCurrency('XYZ')).toBe(false);
        });
    });

    describe('getCommonCurrencies', () => {
        it('should return a list of common currencies', () => {
            const common = CurrencyService.getCommonCurrencies();
            expect(common).toContain('USD');
            expect(common).toContain('TWD');
            expect(common.length).toBeGreaterThan(0);
        });
    });
});
