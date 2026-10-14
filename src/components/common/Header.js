"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Menu } from "lucide-react";
import { useRole } from "@/store/RoleContext";

export default function Header({ onMenu }) {
  const router = useRouter();
  const { role, pengguna } = useRole();
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (e) => {
    e.preventDefault();
    router.push("/kasir" + (q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""));
  };

  const nama = pengguna?.nama_lengkap || "Pengguna";
  const inisial = (nama.charAt(0) || "U").toUpperCase();

  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-slate-100 bg-white/90 backdrop-blur-xl lg:left-60">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Menu"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <form onSubmit={go} className="relative w-full max-w-lg flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari barcode, SKU, atau produk… (Ctrl+K)"
            aria-label="Cari produk"
            className="h-10 w-full rounded-lg bg-[#eff4ff] pl-10 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600/20"
          />
        </form>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-2.5 sm:flex">
            <span className="text-right leading-tight">
              <span className="block max-w-[140px] truncate text-[13px] font-bold text-slate-900">{nama}</span>
              <span className="block text-[11px] text-slate-500">{role}</span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white ring-2 ring-emerald-200">
              {inisial}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
