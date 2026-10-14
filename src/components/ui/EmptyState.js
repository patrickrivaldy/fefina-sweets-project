"use client";

export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="rounded-xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200/70">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      {message && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
