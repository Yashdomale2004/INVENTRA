import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { ProtectedRoute } from "./app/ProtectedRoute";
import { useTheme } from "./contexts/ThemeContext";
import { AppLayout } from "./layouts/AppLayout";

const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const InventoryPage = lazy(() => import("./pages/InventoryPage").then((m) => ({ default: m.InventoryPage })));
const EnquiryPage = lazy(() => import("./pages/EnquiryPage").then((m) => ({ default: m.EnquiryPage })));
const StockUpPage = lazy(() => import("./pages/StockUpPage").then((m) => ({ default: m.StockUpPage })));
const TrackPage = lazy(() => import("./pages/TrackPage").then((m) => ({ default: m.TrackPage })));
const OrderStatusPage = lazy(() => import("./pages/OrderStatusPage").then((m) => ({ default: m.OrderStatusPage })));
const MorePage = lazy(() => import("./pages/MorePage").then((m) => ({ default: m.MorePage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import("./pages/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const DistributorManagementPage = lazy(() =>
  import("./pages/DistributorManagementPage").then((m) => ({ default: m.DistributorManagementPage }))
);
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage").then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import("./pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const SupportPage = lazy(() => import("./pages/SupportPage").then((m) => ({ default: m.SupportPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500" />
    </div>
  );
}

function App() {
  const { resolvedTheme } = useTheme();

  return (
    <>
      <Toaster richColors theme={resolvedTheme} />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="enquiry" element={<EnquiryPage />} />
            <Route path="stock-up" element={<StockUpPage />} />
            <Route path="track" element={<TrackPage />} />
            <Route path="order-status" element={<OrderStatusPage />} />
            <Route path="more" element={<MorePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="stock-in" element={<Navigate to="/stock-up" replace />} />
            <Route path="parcels" element={<Navigate to="/track" replace />} />

            <Route path="products" element={<ProductsPage />} />
            <Route path="distributors" element={<DistributorManagementPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="support" element={<SupportPage />} />

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
