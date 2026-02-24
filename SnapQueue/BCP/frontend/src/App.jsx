import { Route, Routes } from "react-router-dom";
import ChatbotWidget from "./components/ChatbotWidget.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import HomePage from "./pages/HomePage.jsx";
import GalleryPage from "./pages/GalleryPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ReservationPage from "./pages/ReservationPage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reservation" element={<ProtectedRoute><ReservationPage /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ChatbotWidget />
    </>
  );
}
