import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoCategorizationService } from './autoCategorizationService';
import { TransactionType, type Category } from '../types';
import { db } from '../db';

// Mock the db module
vi.mock('../db', () => ({
    db: {
        merchantRules: {
            toArray: vi.fn(),
            add: vi.fn(),
            update: vi.fn(),
            where: vi.fn().mockReturnThis(),
            equals: vi.fn().mockReturnThis(),
            below: vi.fn().mockReturnThis(),
            and: vi.fn().mockReturnThis(),
            delete: vi.fn(),
        },
        transactions: {
            toArray: vi.fn(),
        },
    },
}));

describe('AutoCategorizationService', () => {
    const mockCategories: Category[] = [
        { id: 1, name: 'Dining', type: TransactionType.EXPENSE, icon: 'food', color: 'red' },
        { id: 2, name: 'Transportation', type: TransactionType.EXPENSE, icon: 'car', color: 'blue' },
        { id: 3, name: 'Groceries', type: TransactionType.EXPENSE, icon: 'cart', color: 'green' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('autoCategorizeTran', () => {
        it('should return null for empty notes', async () => {
            const result = await AutoCategorizationService.autoCategorizeTran(
                '',
                100,
                TransactionType.EXPENSE,
                mockCategories
            );
            expect(result).toBeNull();
        });

        it('should match keyword rules (e.g., uber -> transportation)', async () => {
            // Mock db.merchantRules.toArray to return empty array so it falls back to keywords
            vi.mocked(db.merchantRules.toArray).mockResolvedValue([]);

            const result = await AutoCategorizationService.autoCategorizeTran(
                'Uber trip',
                20,
                TransactionType.EXPENSE,
                mockCategories
            );

            expect(result).not.toBeNull();
            expect(result?.categoryId).toBe(2); // Transportation
            expect(result?.reason).toContain('Keyword match');
        });

        it('should match merchant rules from DB', async () => {
            // Mock db.merchantRules.toArray to return a matching rule
            vi.mocked(db.merchantRules.toArray).mockResolvedValue([
                {
                    id: 1,
                    pattern: 'starbucks',
                    categoryId: 1, // Dining
                    confidence: 80,
                    usageCount: 5,
                    lastUsed: new Date(),
                },
            ]);

            const result = await AutoCategorizationService.autoCategorizeTran(
                'Starbucks Coffee',
                5,
                TransactionType.EXPENSE,
                mockCategories
            );

            expect(result).not.toBeNull();
            expect(result?.categoryId).toBe(1); // Dining
            expect(result?.reason).toContain('Merchant pattern');
        });
    });

    describe('learnFromUserChoice', () => {
        it('should add a new rule if none exists', async () => {
            // Mock existing rules check to return empty
            vi.mocked(db.merchantRules.where).mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([]),
                }),
            } as any);

            await AutoCategorizationService.learnFromUserChoice(
                'New Merchant',
                1, // Dining
                undefined
            );

            expect(db.merchantRules.add).toHaveBeenCalledWith(expect.objectContaining({
                pattern: 'new.*merchant',
                categoryId: 1,
            }));
        });

        it('should update existing rule', async () => {
            const existingRule = {
                id: 1,
                pattern: 'existing merchant',
                categoryId: 2,
                confidence: 50,
                usageCount: 1,
                lastUsed: new Date(),
            };

            // Mock existing rules check to return the rule
            vi.mocked(db.merchantRules.where).mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([existingRule]),
                }),
            } as any);

            await AutoCategorizationService.learnFromUserChoice(
                'Existing Merchant',
                1, // User changed to Dining
                2 // Suggested was Transportation
            );

            expect(db.merchantRules.update).toHaveBeenCalledWith(1, expect.objectContaining({
                categoryId: 1,
                confidence: 60,
            }));
        });
    });
});
