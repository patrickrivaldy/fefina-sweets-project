"use client";

import { useState } from "react";
import { todayWIB, wibKey } from "@/utils/format";

// Satu-satunya definisi preset periode (dipakai Transaksi, Keuangan, Laporan).
// Kembalikan ["", ""] untuk "semua" (= tanpa filter tanggal).
export function rangeFor(v) {
  const t = todayWIB();
  if (v === "hari-ini" || v === "semua") return v === "semua" ? ["", ""] : [t, t];
  if (v === "7-hari") return [wibKey(Date.now() - 6 * 86400000), t];
  return [t.slice(0, 7) + "-01", t];
}

// State periode siap pakai: preset + from/to + applyPreset.
// setFrom/setTo otomatis menandai preset "custom".
export function usePeriode(awal = "bulan-ini") {
  const [preset, setPreset] = useState(awal);
  const [from, setFromState] = useState(() => rangeFor(awal)[0]);
  const [to, setToState] = useState(() => rangeFor(awal)[1]);

  const applyPreset = (v) => {
    setPreset(v);
    const [f, t] = rangeFor(v);
    setFromState(f);
    setToState(t);
  };
  const setFrom = (v) => {
    setFromState(v);
    setPreset("custom");
  };
  const setTo = (v) => {
    setToState(v);
    setPreset("custom");
  };

  return { preset, setPreset, from, to, setFrom, setTo, applyPreset };
}
