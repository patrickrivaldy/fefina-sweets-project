"use client";

export default function PageHeader({ title, subtitle, action, eyebrow }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] font-bold leading-7 tracking-tight text-slate-900 sm:text-[28px] sm:leading-9">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}
