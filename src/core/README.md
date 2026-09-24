# v2 記帳核心（`src/core`）

記帳的資料層，不依賴任何 UI。資料存在 IndexedDB `studybudget-v2`，畫面透過 `ledgerDb`（`db.ts`）存取。

## 資料模型

| 規則 | 說明 |
| --- | --- |
| 金額 | 一律存整數最小單位（`amountMinor`）。USD 以「分」存，TWD／JPY 以「元」存（見 `money.ts` 的 `CURRENCIES`）。不存浮點數。 |
| 餘額 | 不存在帳戶上。餘額 = `openingBalanceMinor` + 該帳戶所有 posting 的 `amountMinor` 總和（`getAccountBalance`／`getBalances`）。 |
| 交易 | 每筆紀錄是一個帳戶的一筆 posting，`amountMinor` 帶正負號：收入為正、支出為負。 |
| 轉帳 | 兩筆紀錄共用 `transferId`：轉出帳戶為負、轉入帳戶為正。同幣別時兩邊金額必須相等（手續費請另記支出）；跨幣別時兩邊各記實際金額。 |
| 外幣刷卡 | `originalAmountMinor` + `originalCurrency` 記錄原幣金額；`amountMinor` 是帳戶實際被扣的金額。 |
| 日期 | `"YYYY-MM-DD"` 字串，沒有時區問題，JSON 還原後不會變型別。 |
| ID | UUID 字串，方便日後匯入合併或雲端同步。 |
| 寫入 | 會動到多筆紀錄的操作（編輯、刪除轉帳、刪除分類、匯入）都包在 Dexie transaction 裡，失敗時整批回滾。 |

## 報表與匯率

- `exchangeRates` 每個幣別對、每天存一筆匯率；`createRateResolver` 取「該日或之前最近的一筆」，也會用反向匯率。
- 報表（`reports.ts`）是純函式：每筆交易依自己日期的匯率換算成主要幣別。**缺匯率的幣別不會被加總**，而是列在 `missingRates`，讓 UI 提示使用者補匯率。
- 轉帳不算收入也不算支出。

## 錯誤處理

驗證失敗會丟出 `LedgerError`，帶有固定的 `code`（見 `errors.ts`），UI 可依 code 顯示翻譯後的訊息。

## 測試

```bash
npx vitest run src/core
```

測試使用 `fake-indexeddb`，每個測試有自己的記憶體資料庫（`src/test/ledgerDb.ts`）。
