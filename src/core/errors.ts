export type LedgerErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_NAME'
  | 'INVALID_KIND'
  | 'INVALID_AMOUNT'
  | 'INVALID_DATE'
  | 'INVALID_CURRENCY'
  | 'INVALID_RATE'
  | 'INVALID_ORIGINAL_AMOUNT'
  | 'INVALID_FEE'
  | 'INVALID_CATEGORY_PARENT'
  | 'ACCOUNT_ARCHIVED'
  | 'ACCOUNT_IN_USE'
  | 'CATEGORY_ARCHIVED'
  | 'CATEGORY_IN_USE'
  | 'CATEGORY_KIND_MISMATCH'
  | 'CURRENCY_LOCKED'
  | 'DUPLICATE_NAME'
  | 'SAME_ACCOUNT_TRANSFER'
  | 'TRANSFER_AMOUNT_REQUIRED'
  | 'TRANSFER_AMOUNT_MISMATCH'
  | 'INVALID_BACKUP';

/** Error with a stable `code` the UI can map to a translated message. */
export class LedgerError extends Error {
  readonly code: LedgerErrorCode;

  constructor(code: LedgerErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'LedgerError';
    this.code = code;
  }
}
