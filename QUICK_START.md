# StudyBudget Pro - 快速開始指南

## 🚀 立即開始

### 1. 環境準備
```bash
# 確保 Node.js 版本 >= 18
node --version

# 確保 npm 已安裝
npm --version
```

### 2. 安裝與運行
```bash
# 克隆專案 (如果尚未克隆)
git clone <repository-url>
cd Bookkeeping_app

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 開啟瀏覽器訪問 http://localhost:5173
```

### 3. 建構生產版本
```bash
# 建構生產版本
npm run build

# 預覽生產版本
npm run preview
```

## 📱 主要功能快速導覽

### 帳戶管理
1. 點擊底部導航的「帳戶」圖示
2. 點擊「新增帳戶」按鈕
3. 選擇帳戶類型 (支援29種多國帳戶)
4. 設定貨幣和初始餘額
5. 儲存帳戶

### 記帳功能
1. 點擊底部導航的「交易」圖示
2. 點擊「新增交易」按鈕
3. 選擇交易類型 (收入/支出/轉帳)
4. 輸入金額和描述
5. 系統會自動建議分類
6. 確認並儲存

### 統計分析
1. 點擊底部導航的「統計」圖示
2. 選擇時間範圍 (日/週/月/季/自定義)
3. 查看各種圖表分析
4. 支援多貨幣統計

### 設定與個人化
1. 點擊底部導航的「設定」圖示
2. 切換語言 (繁體中文/英文)
3. 設定通知提醒
4. 管理PWA功能

## 🛠️ 開發者快速指南

### 專案結構
```
src/
├── components/     # UI組件庫
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Charts.tsx
│   └── ...
├── pages/         # 頁面組件
│   ├── Accounts/
│   ├── Transactions/
│   ├── Statistics/
│   └── ...
├── services/      # 業務邏輯服務
│   ├── autoCategorizationService.ts
│   ├── currencyService.ts
│   └── ...
├── db/           # 資料庫層
│   ├── index.ts
│   ├── accounts.ts
│   └── ...
├── contexts/     # React Context
├── hooks/        # 自定義Hooks
├── types/        # TypeScript類型
├── locales/      # 語言包
└── utils/        # 工具函數
```

### 常用開發指令
```bash
# 開發模式 (熱重載)
npm run dev

# 建構檢查
npm run build

# 代碼檢查
npm run lint

# 類型檢查
npm run type-check
```

### 添加新功能
1. 在 `src/components/` 創建新組件
2. 在 `src/pages/` 創建新頁面
3. 在 `src/services/` 添加業務邏輯
4. 更新 `src/types/` 類型定義
5. 添加對應的語言包到 `src/locales/`

## 🔧 常見問題

### Q: 如何添加新的帳戶類型？
A: 編輯 `src/types/index.ts` 中的 `AccountType` 類型，並更新語言包。

### Q: 如何添加新的交易分類？
A: 編輯 `src/services/studentCategoryService.ts` 和對應的語言包。

### Q: 如何修改圖表樣式？
A: 編輯 `src/components/Charts.tsx` 中的圖表配置。

### Q: 如何添加新語言？
A: 在 `src/locales/` 創建新的語言包，並更新 `src/i18n/index.ts`。

## 📊 當前狀態

- **開發進度**: 80% 完成
- **主要功能**: 全部完成
- **待完成**: 測試框架、錯誤處理、生產環境配置

## 🆘 需要幫助？

1. 查看 [開發計劃書](StudyBudget_Pro_Development_Plan.md)
2. 檢查 [README.md](README.md) 詳細說明
3. 查看程式碼註解和類型定義
4. 運行 `npm run dev` 並檢查控制台訊息

---

**快速開始完成！** 🎉  
現在您可以開始使用或開發 StudyBudget Pro 了！
