import { useState } from "react";
import { FaRestroom, FaSpinner } from "react-icons/fa";
import { AuthProvider, useAuth } from "./auth.js";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";

type View = "login" | "register";

function Shell() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>("login");

  if (loading) {
    return (
      <main className="min-h-full w-full flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
        <FaRestroom className="text-3xl text-emerald-400" />
        <FaSpinner className="animate-spin" />
      </main>
    );
  }

  if (!user) {
    return view === "login" ? (
      <LoginPage onGoRegister={() => setView("register")} />
    ) : (
      <RegisterPage onGoLogin={() => setView("login")} />
    );
  }

  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
