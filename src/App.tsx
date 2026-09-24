import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './app/Layout';
import { AccountsPage } from './features/accounts/AccountsPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="*" element={<Navigate to="/transactions" replace />} />
      </Route>
    </Routes>
  );
}
