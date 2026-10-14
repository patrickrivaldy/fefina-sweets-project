"use client";

export default function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff4ff] text-emerald-700">
            {icon}
          </span>
        )}
      </div>
      <p className="tnum mt-2 break-words text-xl font-bold leading-8 tracking-tight text-slate-900 sm:text-[28px]">
        {value}
      </p>
      {sub && <div className="mt-2">{sub}</div>}
      {accent && <div className="mt-2 text-xs text-slate-500">{accent}</div>}
    </div>
  );
}
