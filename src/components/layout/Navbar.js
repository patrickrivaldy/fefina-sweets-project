"use client";

import { Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    router.replace("/login");
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>

        <p className="mt-1 text-sm text-slate-500">
          Selamat datang di sistem Fefina Sweets
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative rounded-xl p-2 text-slate-500 transition hover:bg-orange-50 hover:text-orange-600"
          title="Notifikasi"
        >
          <Bell size={20} strokeWidth={1.8} />

          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
        </button>

        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-600">
            A
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">Admin</p>

            <p className="text-xs text-slate-400">Administrator</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
