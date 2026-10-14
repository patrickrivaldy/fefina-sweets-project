"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/config/supabase";
import { useRole, bolehBuka } from "@/store/RoleContext";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Handshake,
  Users,
  Wallet,
  Plus,
  ChartColumn,
  ReceiptText,
  CircleUserRound,
  LogOut,
  X,
  Store,
  Wheat,
  Factory,
  ClipboardList,
  UserCog,
} from "lucide-react";

const MAIN = [
  { name: "Kasir / POS", href: "/kasir", icon: ShoppingCart },
  { name: "Manajemen Produk", href: "/produk", icon: Package },
  { name: "Produksi & Resep", href: "/produksi", icon: Factory },
  { name: "Bahan Baku", href: "/bahan", icon: Wheat },
  { name: "Konsinyasi & Reseller", href: "/konsinyasi", icon: Handshake },
  { name: "Keuangan & Kas", href: "/pengeluaran", icon: Wallet },
  { name: "Catat Pengeluaran", href: "/catat-pengeluaran", icon: Plus },
];

const MORE = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Stok", href: "/stok", icon: Boxes },
  { name: "Stock Opname", href: "/opname", icon: ClipboardList },
  { name: "Data Reseller", href: "/reseller", icon: Users },
  { name: "Pengguna", href: "/pengguna", icon: UserCog },
  { name: "Riwayat", href: "/transaksi", icon: ReceiptText },
  { name: "Laporan Laba", href: "/laporan", icon: ChartColumn },
  { name: "Profil", href: "/pengaturan", icon: CircleUserRound },
];

function on(path, href) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

function Item({ m, path, onClose }) {
  const Icon = m.icon;
  const active = on(path, m.href);
  return (
    <Link
      href={m.href}
      onClick={onClose}
      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition ${
        active
          ? "bg-emerald-700 font-bold text-white shadow-sm"
          : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon size={19} strokeWidth={active ? 2.3 : 1.9} className="shrink-0" />
      <span className="flex-1">{m.name}</span>
    </Link>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, pengguna } = useRole();
  const main = MAIN.filter((m) => bolehBuka(role, m.href));
  const more = MORE.filter((m) => bolehBuka(role, m.href));

  const logout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  };

  const body = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <Store size={19} strokeWidth={2.2} />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-bold text-slate-900">
            Fefina Sweets
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            POS & Konsinyasi
          </span>
        </span>
      </div>

      <nav className="nice-scroll flex-1 space-y-0.5 overflow-y-auto px-4 py-2">
        {main.map((m) => (
          <Item key={m.href} m={m} path={pathname} onClose={onClose} />
        ))}
        <p className="px-4 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Lainnya
        </p>
        {more.map((m) => (
          <Item key={m.href} m={m} path={pathname} onClose={onClose} />
        ))}
        <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {pengguna ? `${pengguna.nama_lengkap} • ${role}` : `Peran: ${role}`}
        </p>
      </nav>

      <div className="p-4">
        <button
          type="button"
          onClick={logout}
          className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={17} /> Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-60 flex-col bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] lg:flex">
        {body}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/45" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-2xl">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="h-[calc(100%-48px)]">{body}</div>
          </aside>
        </div>
      )}
    </>
  );
}
