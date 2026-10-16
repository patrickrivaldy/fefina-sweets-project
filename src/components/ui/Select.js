"use client";

import { ChevronDown } from "lucide-react";

// Dropdown bertema: 1 komponen untuk semua <select> di aplikasi.
// variant "form"   → input putih berbingkai (di dalam form/modal)
// variant "filter" → abu kebiruan tanpa bingkai (bilah saring/pencarian)
export default function Select({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  variant = "form",
  children,
}) {
  const cls =
    variant === "filter"
      ? "h-11 w-full appearance-none rounded-lg bg-[#eff4ff] py-0 pl-3.5 pr-10 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600/25 disabled:opacity-50"
      : "h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white py-0 pl-3.5 pr-10 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15 disabled:bg-slate-100 disabled:opacity-70";
  return (
    <div className="min-w-0">
      {label && (
        <span className="mb-1.5 block text-[13px] font-bold text-slate-700">{label}</span>
      )}
      <span className="relative block">
        <select value={value} onChange={onChange} disabled={disabled} className={cls}>
          {placeholder && <option value="">{placeholder}</option>}
          {children}
        </select>
        <ChevronDown
          size={17}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700"
        />
      </span>
    </div>
  );
}
