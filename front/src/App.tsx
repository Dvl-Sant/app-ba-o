import { useState } from "react";
import { FaRestroom, FaSpinner } from "react-icons/fa";
import { AuthProvider, useAuth } from "./auth.js";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { AdminPage } from "./pages/AdminPage.js";

type AuthView = "login" | "register";
type Page = "dashboard" | "admin";

function Shell() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>("login");
  const [page, setPage] = useState<Page>("dashboard");

  if (loading) {
    return (
      <main className="min-h-full w-full flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
        <FaRestroom className="text-3xl text-emerald-400" />
        <FaSpinner className="animate-spin" />
      </main>
    );
  }

  if (!user) {
    return authView === "login" ? (
      <LoginPage onGoRegister={() => setAuthView("register")} />
    ) : (
      <RegisterPage onGoLogin={() => setAuthView("login")} />
    );
  }

  if (page === "admin" && user.role === "admin") {
    return <AdminPage onBack={() => setPage("dashboard")} />;
  }

  return <DashboardPage onAdmin={() => setPage("admin")} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
