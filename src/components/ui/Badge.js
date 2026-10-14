"use client";

const MAP = {
  green: ["bg-emerald-50 text-emerald-800", "bg-emerald-600"],
  yellow: ["bg-amber-50 text-amber-800", "bg-amber-500"],
  red: ["bg-red-50 text-red-700", "bg-red-500"],
  blue: ["bg-blue-50 text-blue-700", "bg-blue-500"],
  gray: ["bg-slate-100 text-slate-600", "bg-slate-400"],
  dark: ["bg-emerald-700 text-white", "bg-emerald-400"],
};

export default function Badge({ tone = "gray", children, dot = true }) {
  const [pill, d] = MAP[tone] || MAP.gray;
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${pill}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${d}`} />}
      {children}
    </span>
  );
}
