"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn !== "true") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Ringkasan Dashboard
        </h1>

        <p className="mt-2 text-slate-600">
          Pantau aktivitas dan informasi usaha Fefina Sweets.
        </p>

        <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Area dashboard</p>

          <h2 className="mt-2 text-lg font-semibold text-slate-800">
            Dashboard Fefina Sweets
          </h2>
        </div>
      </div>
    </DashboardLayout>
  );
}