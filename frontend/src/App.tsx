import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./app/ProtectedRoute";
import { hasSupabaseConfig } from "./lib/supabase";
import { AppLayout } from "./layouts/AppLayout";
import { EnquiryPage } from "./pages/EnquiryPage";
import { HomePage } from "./pages/HomePage";
import { InventoryPage } from "./pages/InventoryPage";
import { MorePage } from "./pages/MorePage";
import { DistributorManagementPage } from "./pages/DistributorManagementPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { OrderStatusPage } from "./pages/OrderStatusPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProductsPage } from "./pages/ProductsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StockUpPage } from "./pages/StockUpPage";
import { TrackPage } from "./pages/TrackPage";
import { AboutPage } from "./pages/AboutPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { SupportPage } from "./pages/SupportPage";
import { TermsPage } from "./pages/TermsPage";
import { DashboardPage } from "./pages/DashboardPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={hasSupabaseConfig ? <LoginPage /> : <Navigate to="/home" replace />} />

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
  );
}

export default App;
