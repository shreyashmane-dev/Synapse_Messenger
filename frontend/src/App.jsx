import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import JoinCommunity from "./pages/JoinCommunity";

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/auth" />;
}

function AppContent() {
  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/join/:id" element={
          <PrivateRoute>
             <JoinCommunity />
          </PrivateRoute>
        } />
        <Route path="/app/*" element={
          <PrivateRoute>
             <Dashboard />
          </PrivateRoute>
        } />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
       <AppContent />
    </AuthProvider>
  );
}
