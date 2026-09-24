import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './app/Layout';
import { AccountsPage } from './features/accounts/AccountsPage';
import { OverviewPage } from './features/overview/OverviewPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/transactions" replace />} />
      </Route>
    </Routes>
  );
}
