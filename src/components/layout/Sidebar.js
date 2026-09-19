"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ArrowUpDown,
  RefreshCcw,
  Wallet,
  FileBarChart,
  UserRound,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const mainMenus = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Kasir",
      href: "/kasir",
      icon: ShoppingCart,
    },
    {
      name: "Produk",
      href: "/produk",
      icon: Package,
    },
    {
      name: "Manajemen Stok",
      href: "/stok",
      icon: ArrowUpDown,
    },
  ];

  const businessMenus = [
    {
      name: "Konsinyasi",
      href: "/konsinyasi",
      icon: RefreshCcw,
    },
    {
      name: "Pengeluaran",
      href: "/pengeluaran",
      icon: Wallet,
    },
  ];

  const reportMenus = [
    {
      name: "Laporan",
      href: "/laporan",
      icon: FileBarChart,
    },
    {
      name: "Profil",
      href: "/pengaturan",
      icon: UserRound,
    },
  ];

  const isActive = (href) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  };

  const renderMenu = (menus) => {
    return menus.map((menu) => {
      const Icon = menu.icon;
      const active = isActive(menu.href);

      return (
        <Link
          key={menu.name}
          href={menu.href}
          className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-1xl transition ${
            active
              ? "bg-[#FE7700] text-white"
              : "text-white/80 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Icon size={35} strokeWidth={1.7} />
          <span>{menu.name}</span>
        </Link>
      );
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    router.replace("/login");
  };

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-[#4B3621] px-4 py-4 text-white">
      {/* Logo */}
      <div className="mb-7 flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#A9D59B] text-xl">
          🍊
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-wide">
            FEFINA
          </h1>

          <p className="text-sm text-white/80">
            Sweets
          </p>
        </div>
      </div>

      {/* Menu Utama */}
      <nav>
        <p className="mb-3 px-2 text-xs font-medium text-white/60">
          MENU UTAMA
        </p>

        <div className="space-y-2">
          {renderMenu(mainMenus)}
        </div>
      </nav>

      {/* Kelola Usaha */}
      <nav className="mt-7">
        <p className="mb-3 px-2 text-xs font-medium text-white/60">
          KELOLA USAHA
        </p>

        <div className="space-y-2">
          {renderMenu(businessMenus)}
        </div>
      </nav>

      {/* Laporan */}
      <nav className="mt-7">
        <p className="mb-3 px-2 text-xs font-medium text-white/60">
          LAPORAN
        </p>

        <div className="space-y-2">
          {renderMenu(reportMenus)}
        </div>
      </nav>

      <div className="flex-1" />

      {/* Informasi Admin */}
      <div className="border-t border-white/15 pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-orange-400 text-orange-300">
            <UserRound size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Admin
            </p>

            <p className="text-xs text-white/60">
              Administrator
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Keluar"
            aria-label="Keluar"
            className="rounded-md p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}