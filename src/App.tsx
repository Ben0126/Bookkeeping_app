import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './app/Layout';
import { AccountsPage } from './features/accounts/AccountsPage';
import { GuidePage } from './features/onboarding/GuidePage';
import { WelcomePage } from './features/onboarding/WelcomePage';
import { OverviewPage } from './features/overview/OverviewPage';
import { CategoriesPage, RecurringPage, SettingsPage } from './features/settings/SettingsPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route element={<Layout />}>
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/categories" element={<CategoriesPage />} />
        <Route path="/settings/recurring" element={<RecurringPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="*" element={<Navigate to="/transactions" replace />} />
      </Route>
    </Routes>
  );
}
