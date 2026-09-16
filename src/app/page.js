"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardCard from "@/components/layout/DashboardCard";

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

        <div className="mt-6">
          <DashboardCard />
        </div>
      </div>
    </DashboardLayout>
  );
}