import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/components/auth/LoginPage';
import SignupPage from '@/components/auth/SignupPage';
import ForgotPasswordPage from '@/components/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/components/auth/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import ActivitiesPage from '@/pages/ActivitiesPage';
import CalendarPage from '@/pages/CalendarPage';
import InvestmentsPage from '@/pages/InvestmentsPage';
import LentMoneyPage from '@/pages/LentMoneyPage';
import AccountsPage from '@/pages/AccountsPage';
import CategoriesPage from '@/pages/CategoriesPage';
import SettingsPage from '@/pages/SettingsPage';
import TransactionFormPage from '@/pages/TransactionFormPage';
import EmiLoanPage from '@/pages/EmiLoanPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Application Routes wrapped in AppLayout */}
          <Route
            path="/"
            element={
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            }
          />
          <Route
            path="/activities"
            element={
              <AppLayout>
                <ActivitiesPage />
              </AppLayout>
            }
          />
          <Route
            path="/calendar"
            element={
              <AppLayout>
                <CalendarPage />
              </AppLayout>
            }
          />
          <Route
            path="/investments"
            element={
              <AppLayout>
                <InvestmentsPage />
              </AppLayout>
            }
          />
          <Route
            path="/lent-money"
            element={
              <AppLayout>
                <LentMoneyPage />
              </AppLayout>
            }
          />
          <Route
            path="/emi-loan"
            element={
              <AppLayout>
                <EmiLoanPage />
              </AppLayout>
            }
          />
          <Route
            path="/accounts"
            element={
              <AppLayout>
                <AccountsPage />
              </AppLayout>
            }
          />
          <Route
            path="/categories"
            element={
              <AppLayout>
                <CategoriesPage />
              </AppLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            }
          />
          <Route
            path="/transaction/new/:type"
            element={
              <AppLayout>
                <TransactionFormPage />
              </AppLayout>
            }
          />
          <Route
            path="/transaction/edit/:id"
            element={
              <AppLayout>
                <TransactionFormPage />
              </AppLayout>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  );
}

export default App;
