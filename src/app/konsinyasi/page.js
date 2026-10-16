"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import AddKonsinyasiModal from "@/features/konsinyasi/components/AddKonsinyasiModal";
import EditKonsinyasiModal from "@/features/konsinyasi/components/EditKonsinyasiModal";
import BarangLakuModal from "@/features/konsinyasi/components/BarangLakuModal";
import BayarKonsinyasiModal from "@/features/konsinyasi/components/BayarKonsinyasiModal";
import { supabase } from "@/config/supabase";
import { formatRupiah, formatTanggal, generateIdKonsinyasi, todayWIB, wibDateTime, pesanErrorDb } from "@/utils/format";
import { STATUS_PEMBAYARAN, STATUS_KONSINYASI } from "@/constants/app";
import {
  Search,
  Plus,
  Download,
  Store,
  Pencil,
  Trash2,
  MessageCircle,
  FileText,
  Handshake,
  TrendingUp,
  Wallet,
  Boxes,
  Users,
  Lightbulb,
} from "lucide-react";

export default function KonsinyasiPage() {
  const [rows, setRows] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [resellerFull, setResellerFull] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("nota");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showLaku, setShowLaku] = useState(false);
  const [lakuTarget, setLakuTarget] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [aktiv, setAktiv] = useState([]);
  const [bayar, setBayar] = useState([]);
  const [showBayar, setShowBayar] = useState(false);
  const [bayarTarget, setBayarTarget] = useState(null);
  const [fiturMigrasi, setFiturMigrasi] = useState(true); // cicilan/jatuh tempo butuh db-draft.md terbaru

  // Jejak aktivitas per nota (tabel opsional aktivitas_konsinyasi — lihat SQL migrasi
  // di bawah; bila tabel belum ada, insert gagal diam-diam dan alur utama tetap jalan).
  const catatAktivitas = async (id_konsinyasi, jenis, keterangan) => {
    try {
      await supabase.from("aktivitas_konsinyasi").insert([{ id_konsinyasi, jenis, keterangan }]);
    } catch { /* abaikan */ }
  };

  const loadAktivitas = async () => {
    const { data } = await supabase
      .from("aktivitas_konsinyasi")
      .select("*")
      .order("tanggal", { ascending: false })
      .limit(200);
    setAktiv(data || []);
  };

  const loadRows = async () => {
    // Coba dengan kolom migrasi v2 (jatuh_tempo); fallback bila migrasi belum jalan.
    const selPenuh = `id_konsinyasi, tanggal_titip, status_konsinyasi, status_pembayaran, total_tagihan, id_mitra, jatuh_tempo,
        mitra_toko (id_mitra, nama_toko),
        detail_konsinyasi (id_detail_kns, jumlah_titip, jumlah_laku, jumlah_retur_bagus, jumlah_retur_rusak, subtotal, id_produk,
          produk (nama_produk, harga_jual))`;
    const selDasar = selPenuh.replace(", jatuh_tempo", "");
    let res = await supabase.from("nota_konsinyasi").select(selPenuh).order("tanggal_titip", { ascending: false });
    if (res.error && /column|jatuh_tempo/i.test(res.error.message || "")) {
      res = await supabase.from("nota_konsinyasi").select(selDasar).order("tanggal_titip", { ascending: false });
      setFiturMigrasi(false);
    }
    const { data, error } = res;
    if (error) {
      setError("Gagal memuat konsinyasi.");
      setRows([]);
    } else {
      setRows(data || []);
      setError("");
      if (data?.length && !focusId) setFocusId(data[0].id_konsinyasi);
    }
  };

  const loadBayar = async () => {
    const { data, error } = await supabase
      .from("pembayaran_konsinyasi")
      .select("*")
      .order("tanggal", { ascending: false })
      .limit(300);
    if (error) {
      setBayar([]);
      if (/relation|table|column/i.test(error.message || "")) setFiturMigrasi(false);
    } else setBayar(data || []);
  };

  const loadForm = async () => {
    const [r, p, rf] = await Promise.all([
      supabase.from("mitra_toko").select("id_mitra, nama_toko").eq("is_deleted", false).order("nama_toko"),
      supabase.from("produk").select("id_produk, nama_produk, harga_jual, stok").eq("is_deleted", false).order("nama_produk"),
      supabase.from("mitra_toko").select("*").eq("is_deleted", false).order("nama_toko"),
    ]);
    if (!r.error) setResellers(r.data || []);
    if (!p.error) setProducts(p.data || []);
    if (!rf.error) setResellerFull(rf.data || []);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadRows(), loadForm(), loadAktivitas(), loadBayar()]);
      setLoading(false);
    };
    init();
  }, []);

  const add = async ({ id_mitra, tanggal_titip, jatuh_tempo, items }) => {
    const mitraId = id_mitra;
    setBusy(true);
    try {
      // cek stok terbaru untuk semua macam sekaligus
      const { data: fresh } = await supabase
        .from("produk")
        .select("id_produk, stok, nama_produk")
        .in("id_produk", items.map((i) => i.id_produk));
      for (const it of items) {
        const p = fresh?.find((x) => x.id_produk === it.id_produk);
        if (!p || p.stok < it.jumlah_titip)
          throw new Error(`${p?.nama_produk || "Produk"}: stok tinggal ${p?.stok || 0}.`);
      }
      const id_konsinyasi = generateIdKonsinyasi();
      const header = {
        id_konsinyasi, tanggal_titip, status_konsinyasi: "Berjalan", status_pembayaran: "Belum Lunas",
        total_tagihan: 0, id_mitra: mitraId,
      };
      if (fiturMigrasi && jatuh_tempo) header.jatuh_tempo = jatuh_tempo;
      const { error: cErr } = await supabase.from("nota_konsinyasi").insert([header]);
      if (cErr) throw new Error(cErr.message);
      const { error: dErr } = await supabase.from("detail_konsinyasi").insert(
        items.map((it) => ({
          id_konsinyasi, id_produk: it.id_produk,
          jumlah_titip: it.jumlah_titip, jumlah_laku: 0,
          jumlah_retur_bagus: 0, jumlah_retur_rusak: 0, subtotal: 0,
        }))
      );
      if (dErr) throw new Error(dErr.message);
      // Stok dipotong otomatis oleh trigger DB trg_potong_stok_titip — tanpa update manual.
      const totalPcs = items.reduce((s, it) => s + it.jumlah_titip, 0);
      await catatAktivitas(id_konsinyasi, "Nota dibuat", `Titip ${totalPcs} pcs (${items.length} macam)`);
      await Promise.all([loadRows(), loadForm(), loadAktivitas()]);
      setShowAdd(false);
    } finally {
      setBusy(false);
    }
  };

  // UPDATE/DELETE detail_konsinyasi tidak punya trigger DB, jadi selisih stok
  // diatur manual di sini — master produk DAN batch FIFO harus jalan berbarengan,
  // kalau tidak angkanya selisih (batch aktif tidak sesuai).
  const potongBatchFIFO = async (id_produk, qty) => {
    let sisa = qty;
    const { data } = await supabase
      .from("batch_produk")
      .select("id_batch_produk, stok_sisa")
      .eq("id_produk", id_produk)
      .gt("stok_sisa", 0)
      .order("tanggal_kadaluarsa", { ascending: true, nullsFirst: false })
      .order("tanggal_produksi", { ascending: true });
    for (const b of data || []) {
      if (sisa <= 0) break;
      const potong = Math.min(b.stok_sisa, sisa);
      await supabase.from("batch_produk").update({ stok_sisa: b.stok_sisa - potong }).eq("id_batch_produk", b.id_batch_produk);
      sisa -= potong;
    }
  };

  const tambahBatch = async (id_produk, qty) => {
    if (qty <= 0) return;
    const { data: v } = await supabase.from("view_modal_produk").select("modal_hpp_aktual").eq("id_produk", id_produk).single();
    await supabase.from("batch_produk").insert([{
      id_produk, stok_sisa: qty, hpp_produksi: Number(v?.modal_hpp_aktual) || 0, tanggal_kadaluarsa: null,
    }]);
  };

  const tambahStok = async (id_produk, qty) => {
    if (qty <= 0) return;
    const { data: p } = await supabase.from("produk").select("stok").eq("id_produk", id_produk).single();
    if (p) await supabase.from("produk").update({ stok: p.stok + qty }).eq("id_produk", id_produk);
    await tambahBatch(id_produk, qty);
  };

  const kurangStok = async (id_produk, qty) => {
    if (qty <= 0) return;
    const { data: p } = await supabase.from("produk").select("stok").eq("id_produk", id_produk).single();
    if (p) await supabase.from("produk").update({ stok: Math.max(0, p.stok - qty) }).eq("id_produk", id_produk);
    await potongBatchFIFO(id_produk, qty);
  };

  const editSubmit = async (d) => {
    setBusy(true);
    try {
      const mitraId = d.id_mitra;
      // stok terbaru untuk validasi tambah titip (UPDATE detail tidak punya trigger, jadi selisih diatur manual)
      const needIds = [
        ...d.lines.filter((l) => !l.id_detail_kns).map((l) => l.id_produk),
        ...d.lines.filter((l) => l.id_detail_kns && l.jumlah_titip > l.titipAwal).map((l) => l.id_produk),
      ];
      let fresh = [];
      if (needIds.length) {
        const { data } = await supabase.from("produk").select("id_produk, stok").in("id_produk", [...new Set(needIds)]);
        fresh = data || [];
      }
      for (const l of d.lines) {
        if (l.id_detail_kns && l.jumlah_titip > l.titipAwal) {
          const cur = fresh.find((x) => x.id_produk === l.id_produk);
          if ((l.jumlah_titip - l.titipAwal) > (cur?.stok || 0))
            throw new Error("Stok tidak cukup untuk menambah titipan.");
        }
        if (!l.id_detail_kns) {
          const cur = fresh.find((x) => x.id_produk === l.id_produk);
          if (l.jumlah_titip > (cur?.stok || 0)) throw new Error("Stok tidak cukup.");
        }
      }

      // Status + retur lama (untuk celah trigger: bila nota SUDAH Selesai, trigger
      // retur tidak jalan sehingga tambahan retur dikembalikan manual di bawah).
      const [{ data: notaLama }, { data: detLama }] = await Promise.all([
        supabase.from("nota_konsinyasi").select("status_konsinyasi").eq("id_konsinyasi", d.id_konsinyasi).single(),
        supabase.from("detail_konsinyasi").select("id_detail_kns, id_produk, jumlah_retur_bagus, jumlah_retur_rusak").eq("id_konsinyasi", d.id_konsinyasi),
      ]);

      // 1. baris yang ditarik: hapus + kembalikan sisa ke stok + batch (DELETE tidak punya trigger)
      for (const r of d.removedRestore) {
        await supabase.from("detail_konsinyasi").delete().eq("id_konsinyasi", d.id_konsinyasi).eq("id_produk", r.id_produk);
        if (r.sisa > 0) await tambahStok(r.id_produk, r.sisa);
      }
      // 2. baris lama: update + selisih titip ke stok + batch
      for (const l of d.lines.filter((x) => x.id_detail_kns)) {
        const sub = l.jumlah_laku * l.harga;
        const { data: upd, error } = await supabase.from("detail_konsinyasi").update({
          jumlah_titip: l.jumlah_titip, jumlah_laku: l.jumlah_laku, subtotal: sub,
          jumlah_retur_bagus: l.jumlah_retur_bagus || 0,
          jumlah_retur_rusak: l.jumlah_retur_rusak || 0,
        }).eq("id_detail_kns", l.id_detail_kns).select("id_detail_kns");
        if (error) throw new Error(error.message);
        if (!upd || upd.length === 0) throw new Error(`Baris ${l.nama} tidak ketemu saat menyimpan. Refresh lalu ulangi.`);
        const diff = l.titipAwal - l.jumlah_titip; // + berarti stok kembali
        if (diff > 0) await tambahStok(l.id_produk, diff);
        else if (diff < 0) await kurangStok(l.id_produk, -diff);
      }
      // 3. baris baru: insert (trigger DB otomatis potong stok, jadi tanpa update manual)
      for (const l of d.lines.filter((x) => !x.id_detail_kns)) {
        const { error } = await supabase.from("detail_konsinyasi").insert([{
          id_konsinyasi: d.id_konsinyasi, id_produk: l.id_produk,
          jumlah_titip: l.jumlah_titip, jumlah_laku: l.jumlah_laku,
          jumlah_retur_bagus: 0, jumlah_retur_rusak: 0,
          subtotal: l.jumlah_laku * l.harga,
        }]);
        if (error) throw new Error(error.message);
      }
      // 4. header: total = jumlah semua subtotal baris
      const total = d.lines.reduce((s, l) => s + l.jumlah_laku * l.harga, 0);
      // 3b. Celah trigger: nota SUDAH Selesai → kembalikan tambahan retur manual.
      if (notaLama?.status_konsinyasi === "Selesai") {
        try {
          const ids = [...new Set(d.lines.filter((x) => x.id_detail_kns).map((x) => x.id_produk))];
          const { data: mods } = await supabase.from("view_modal_produk").select("id_produk, modal_hpp_aktual").in("id_produk", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
          const mmap = {};
          for (const row of mods || []) mmap[row.id_produk] = Number(row.modal_hpp_aktual) || 0;
          for (const l of d.lines.filter((x) => x.id_detail_kns)) {
            const old = (detLama || []).find((o) => o.id_detail_kns === l.id_detail_kns) || {};
            const tB = (l.jumlah_retur_bagus || 0) - (old.jumlah_retur_bagus || 0);
            const tR = (l.jumlah_retur_rusak || 0) - (old.jumlah_retur_rusak || 0);
            if (tB > 0) await tambahStok(l.id_produk, tB);
            if (tR > 0) {
              const rugi = tR * (mmap[l.id_produk] || 0);
              if (rugi > 0) {
                await supabase.from("pengeluaran_toko").insert([{
                  keterangan: `Rugi Konsinyasi Rusak susulan (${tR} pcs) - ID: ${l.id_produk} - Nota ${d.id_konsinyasi}`,
                  nominal: Math.round(rugi), kategori: "Kerugian / Rusak",
                }]);
              }
            }
          }
        } catch (eSusul) {
          await catatAktivitas(d.id_konsinyasi, "Catatan", `Retur susulan tersimpan, penyesuaian stok/beban gagal: ${eSusul.message || ""}`);
        }
      }
      const headerPatch = {
        tanggal_titip: d.tanggal_titip, status_pembayaran: d.status_pembayaran,
        ...(d.status_konsinyasi ? { status_konsinyasi: d.status_konsinyasi } : {}),
        total_tagihan: total, id_mitra: mitraId,
      };
      if (fiturMigrasi) headerPatch.jatuh_tempo = d.jatuh_tempo || null;
      const { error: cErr } = await supabase.from("nota_konsinyasi").update(headerPatch).eq("id_konsinyasi", d.id_konsinyasi);
      if (cErr) throw new Error(cErr.message);

      await catatAktivitas(d.id_konsinyasi, "Diubah", `Nota diperbarui (${d.lines.length} macam), tagihan ${formatRupiah(total)}`);
      await Promise.all([loadRows(), loadForm(), loadAktivitas()]);
      setShowEdit(false);
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c) => {
    const nMacam = (c.detail_konsinyasi || []).length;
    if (!window.confirm(`Hapus nota ${c.id_konsinyasi} (${nMacam} macam)? Sisa barang kembali ke stok.`)) return;
    setBusy(true);
    try {
      const dets = c.detail_konsinyasi || [];
      await supabase.from("detail_konsinyasi").delete().eq("id_konsinyasi", c.id_konsinyasi);
      await supabase.from("nota_konsinyasi").delete().eq("id_konsinyasi", c.id_konsinyasi);
      for (const det of dets) {
        const sisa = Math.max(0, (det.jumlah_titip || 0) - (det.jumlah_laku || 0) - (det.jumlah_retur_bagus || 0) - (det.jumlah_retur_rusak || 0));
        if (sisa > 0) await tambahStok(det.id_produk, sisa);
      }
      await Promise.all([loadRows(), loadForm()]);
    } catch (e) {
      alert(e.message || "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  };

  const laku = async (payload) => {
    const { consignment } = payload;
    // Format baru: changes[] (multi-produk + retur). Format lama single tetap didukung.
    const changes = payload.changes || [{
      id_detail_kns: payload.id_detail_kns,
      lakuBaru: payload.lakuBaru,
      subtotalBaru: payload.subtotalBaru,
    }];
    setBusy(true);
    try {
      for (const c of changes) {
        const patch = { jumlah_laku: c.lakuBaru, subtotal: c.subtotalBaru };
        if (c.returBagusBaru !== undefined) {
          patch.jumlah_retur_bagus = c.returBagusBaru;
          patch.jumlah_retur_rusak = c.returRusakBaru;
        }
        // Verifikasi tulis: Supabase mengembalikan baris yang kena update.
        // 0 baris = id tidak cocok (data basi) → gagalkan dengan pesan jelas,
        // jangan diam-diam seolah berhasil.
        const { data: upd, error: dErr } = await supabase.from("detail_konsinyasi")
          .update(patch)
          .eq("id_detail_kns", c.id_detail_kns)
          .select("id_detail_kns, jumlah_laku, jumlah_retur_bagus, jumlah_retur_rusak, subtotal");
        if (dErr) throw new Error(dErr.message);
        if (!upd || upd.length === 0) {
          throw new Error(`Penyimpanan ditolak sistem (0 baris terpengaruh untuk ${c.id_detail_kns}). Refresh halaman lalu ulangi.`);
        }
        const r0 = upd[0];
        if (r0.jumlah_laku !== c.lakuBaru
          || (c.returBagusBaru !== undefined && (r0.jumlah_retur_bagus !== c.returBagusBaru || r0.jumlah_retur_rusak !== c.returRusakBaru))) {
          throw new Error(`Verifikasi gagal: nilai yang tersimpan beda (laku ${r0.jumlah_laku}, retur ${r0.jumlah_retur_bagus}/${r0.jumlah_retur_rusak}). Coba lagi.`);
        }
      }
      // total nota = jumlah semua subtotal baris
      const map = new Map(changes.map((c) => [c.id_detail_kns, c.subtotalBaru]));
      const total = (consignment.detail_konsinyasi || []).reduce(
        (s, d) => s + (map.has(d.id_detail_kns) ? map.get(d.id_detail_kns) : (d.subtotal || 0)),
        0
      );
      const { error: cErr } = await supabase.from("nota_konsinyasi")
        .update({ total_tagihan: total })
        .eq("id_konsinyasi", consignment.id_konsinyasi);
      if (cErr) throw new Error(cErr.message);
      const lamaOf = (id) => (consignment.detail_konsinyasi || []).find((d) => d.id_detail_kns === id) || {};
      const sumLaku = changes.reduce((s, c) => s + (c.lakuBaru - (lamaOf(c.id_detail_kns).jumlah_laku || 0)), 0);
      const sumBagus = changes.reduce((s, c) => s + ((c.returBagusBaru ?? lamaOf(c.id_detail_kns).jumlah_retur_bagus ?? 0) - (lamaOf(c.id_detail_kns).jumlah_retur_bagus || 0)), 0);
      const sumRusak = changes.reduce((s, c) => s + ((c.returRusakBaru ?? lamaOf(c.id_detail_kns).jumlah_retur_rusak ?? 0) - (lamaOf(c.id_detail_kns).jumlah_retur_rusak || 0)), 0);
      // Celah trigger: bila nota SUDAH Selesai, tidak ada transisi status sehingga
      // trigger retur tidak jalan — kembalikan stok/beban manual di sini.
      if (consignment.status_konsinyasi === "Selesai" && (sumBagus > 0 || sumRusak > 0)) {
        try {
          const ids = [...new Set(changes.map((c) => lamaOf(c.id_detail_kns).id_produk).filter(Boolean))];
          const { data: mods } = await supabase.from("view_modal_produk").select("id_produk, modal_hpp_aktual").in("id_produk", ids);
          const mmap = {};
          for (const row of mods || []) mmap[row.id_produk] = Number(row.modal_hpp_aktual) || 0;
          for (const c of changes) {
            const lama = lamaOf(c.id_detail_kns);
            const tB = (c.returBagusBaru ?? lama.jumlah_retur_bagus ?? 0) - (lama.jumlah_retur_bagus || 0);
            const tR = (c.returRusakBaru ?? lama.jumlah_retur_rusak ?? 0) - (lama.jumlah_retur_rusak || 0);
            if (tB > 0 && lama.id_produk) await tambahStok(lama.id_produk, tB);
            if (tR > 0 && lama.id_produk) {
              const rugi = tR * (mmap[lama.id_produk] || 0);
              if (rugi > 0) {
                await supabase.from("pengeluaran_toko").insert([{
                  keterangan: `Rugi Konsinyasi Rusak susulan (${tR} pcs) - ID: ${lama.id_produk} - Nota ${consignment.id_konsinyasi}`,
                  nominal: Math.round(rugi), kategori: "Kerugian / Rusak",
                }]);
              }
            }
          }
        } catch (eSusul) {
          await catatAktivitas(consignment.id_konsinyasi, "Catatan", `Retur susulan tersimpan, penyesuaian stok/beban gagal: ${eSusul.message || ""}`);
        }
      }
      const ketRetur = sumBagus + sumRusak > 0 ? `, retur bagus +${sumBagus}${sumRusak > 0 ? `, rusak +${sumRusak}` : ""}` : "";
      await catatAktivitas(consignment.id_konsinyasi, "Laku & retur", `Laku +${sumLaku} pcs${ketRetur}, tagihan ${formatRupiah(total)}`);
      await loadRows();
      await loadAktivitas();
      setShowLaku(false);
      setLakuTarget(null);
      // Semua unit sudah jelas (laku/retur) tapi nota masih Berjalan → tawarkan tutup.
      // Retur saja TIDAK otomatis menyelesaikan (sisa titipan mungkin masih jalan).
      const notaBaru = {
        ...consignment,
        detail_konsinyasi: (consignment.detail_konsinyasi || []).map((d) => {
          const ch = changes.find((x) => x.id_detail_kns === d.id_detail_kns);
          return ch
            ? { ...d, jumlah_laku: ch.lakuBaru, jumlah_retur_bagus: ch.returBagusBaru ?? d.jumlah_retur_bagus, jumlah_retur_rusak: ch.returRusakBaru ?? d.jumlah_retur_rusak, subtotal: ch.subtotalBaru }
            : d;
        }),
      };
      const tuntas = (notaBaru.detail_konsinyasi || []).every((d) =>
        (d.jumlah_laku || 0) + (d.jumlah_retur_bagus || 0) + (d.jumlah_retur_rusak || 0) >= (d.jumlah_titip || 0));
      if (tuntas && consignment.status_konsinyasi !== "Selesai"
        && window.confirm(`Semua barang di nota ${consignment.id_konsinyasi} sudah jelas (laku/retur). Selesaikan nota sekarang? Sisa bagus kembali ke stok.`)) {
        await selesai({ ...notaBaru, total_tagihan: total }, true);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitBayar = async ({ id_konsinyasi, nominal, tanggal }) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("pembayaran_konsinyasi").insert([{
        id_konsinyasi, nominal, tanggal: tanggal ? wibDateTime(tanggal) : new Date().toISOString(),
      }]);
      if (error) throw new Error(error.message);
      await catatAktivitas(id_konsinyasi, "Cicilan", `Bayar ${formatRupiah(nominal)}`);
      await Promise.all([loadRows(), loadBayar(), loadAktivitas()]);
      setShowBayar(false);
      setBayarTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const lunas = async (c) => {
    if (!window.confirm(`Proses pelunasan ${c.id_konsinyasi} (${formatRupiah(c.total_tagihan)})?`)) return;
    setBusy(true);
    try {
      await supabase.from("nota_konsinyasi").update({ status_pembayaran: STATUS_PEMBAYARAN[1] }).eq("id_konsinyasi", c.id_konsinyasi);
      await catatAktivitas(c.id_konsinyasi, "Pelunasan", `Tagihan ${formatRupiah(c.total_tagihan)} dilunasi`);
      await loadRows();
      await loadAktivitas();
    } finally {
      setBusy(false);
    }
  };

  const selesai = async (c, sudahKonfirm = false) => {
    const sisa = (c.detail_konsinyasi || []).reduce(
      (s, d) => s + Math.max(0, (d.jumlah_titip || 0) - (d.jumlah_laku || 0) - (d.jumlah_retur_bagus || 0) - (d.jumlah_retur_rusak || 0)), 0);
    if (!sudahKonfirm && !window.confirm(`Selesaikan nota ${c.id_konsinyasi}? ${sisa} pcs sisa (bagus) kembali ke stok via trigger DB.`)) return;
    setBusy(true);
    try {
      // Snapshot stok sebelum, untuk verifikasi sesudah (trigger kadang diam bila
      // status sudah Selesai / error setengah jalan).
      const ids = [...new Set((c.detail_konsinyasi || []).map((d) => d.id_produk).filter(Boolean))];
      const sebelum = {};
      for (const id of ids) {
        const { data } = await supabase.from("produk").select("stok").eq("id_produk", id).single();
        sebelum[id] = data?.stok ?? 0;
      }
      const { error } = await supabase.from("nota_konsinyasi")
        .update({ status_konsinyasi: STATUS_KONSINYASI[1] })
        .eq("id_konsinyasi", c.id_konsinyasi);
      if (error) throw new Error(error.message);
      await Promise.all([loadRows(), loadForm()]);
      // Verifikasi: tiap retur bagus harus menaikkan stok sebesar itu.
      const susulan = [];
      for (const d of (c.detail_konsinyasi || [])) {
        const rb = d.jumlah_retur_bagus || 0;
        if (rb <= 0) continue;
        const { data } = await supabase.from("produk").select("stok").eq("id_produk", d.id_produk).single();
        const naik = (data?.stok ?? 0) - (sebelum[d.id_produk] ?? 0);
        if (naik < rb) susulan.push({ id_produk: d.id_produk, kurang: rb - Math.max(0, naik) });
      }
      if (susulan.length > 0) {
        for (const s of susulan) await tambahStok(s.id_produk, s.kurang);
        await Promise.all([loadRows(), loadForm()]);
        await catatAktivitas(c.id_konsinyasi, "Catatan", `Stok retur dikembalikan manual (${susulan.map((s) => `${s.kurang} pcs`).join(", ")}) karena trigger tidak jalan`);
      } else {
        await catatAktivitas(c.id_konsinyasi, "Selesai", `Nota diselesaikan, sisa ${sisa} pcs kembali ke stok`);
      }
      await loadAktivitas();
    } catch (e) {
      alert(pesanErrorDb(e.message));
    } finally {
      setBusy(false);
    }
  };

  const waInvoice = (c) => {
    const dets = c.detail_konsinyasi || [];
    const mitraId = c.mitra_toko?.id_mitra || c.id_mitra;
    const r = resellerFull.find((x) => x.id_mitra === mitraId);
    const phone = (r?.no_whatsapp || "").replace(/\D/g, "");
    const tl = dets.reduce((s, d) => s + (d.jumlah_laku || 0), 0);
    const tt = dets.reduce((s, d) => s + (d.jumlah_titip || 0), 0);
    const rincian = dets.map((d) => `- ${d.produk?.nama_produk}: laku ${d.jumlah_laku}/${d.jumlah_titip}`).join("\n");
    const text =
      `Halo ${c.mitra_toko?.nama_toko || "Mitra"}, berikut tagihan konsinyasi ${c.id_konsinyasi} ` +
      `sebesar ${formatRupiah(c.total_tagihan)} (laku ${tl} dari ${tt} pcs, ${dets.length} macam):\n${rincian}\nTerima kasih. - Fefina Sweets`;
    const url = phone
      ? `https://wa.me/${phone.startsWith("0") ? "62" + phone.slice(1) : phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const sumLines = (r, fn) => (r.detail_konsinyasi || []).reduce((s, d) => s + fn(d), 0);
  // Piutang = tagihan − cicilan yang sudah masuk (bukan total tagihan mentah,
  // karena bayar bisa random/sebagian tiap kunjungan).
  const dibayarOf = (id) => bayar.filter((b) => b.id_konsinyasi === id).reduce((s, b) => s + (+b.nominal || 0), 0);
  const sisaOf = (c) => Math.max(0, (+c.total_tagihan || 0) - dibayarOf(c.id_konsinyasi));
  const lewatTempo = (c) => c.jatuh_tempo && c.status_pembayaran !== "Lunas" && c.jatuh_tempo < todayWIB();
  const m = useMemo(() => {
    const mitraAktif = new Set(rows.filter((r) => r.status_pembayaran !== "Lunas").map((r) => r.mitra_toko?.id_mitra)).size;
    const nilaiTitip = rows.reduce((s, r) => s + sumLines(r, (d) => (d.jumlah_titip || 0) * (d.produk?.harga_jual || 0)), 0);
    const totalPcsTitip = rows.reduce((s, r) => s + sumLines(r, (d) => d.jumlah_titip || 0), 0);
    const belum = rows.filter((r) => r.status_pembayaran !== "Lunas").reduce((s, r) => s + sisaOf(r), 0);
    const omzet = rows.reduce((s, r) => s + (+r.total_tagihan || 0), 0);
    return { mitraAktif, nilaiTitip, totalPcsTitip, belum, omzet };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, bayar]);

  const filtered = rows.filter((r) => {
    if (filter !== "Semua" && r.status_pembayaran !== filter) return false;
    const k = search.trim().toLowerCase();
    if (!k) return true;
    const toko = r.mitra_toko?.nama_toko?.toLowerCase() || "";
    const prod = (r.detail_konsinyasi || []).map((d) => d.produk?.nama_produk?.toLowerCase() || "").join(" ");
    return toko.includes(k) || prod.includes(k) || r.id_konsinyasi.toLowerCase().includes(k);
  });

  const focus = rows.find((r) => r.id_konsinyasi === focusId) || filtered[0];
  const focusReseller = focus ? resellerFull.find((x) => x.id_mitra === (focus.mitra_toko?.id_mitra || focus.id_mitra)) : null;
  const focusStats = (() => {
    if (!focus) return { titip: 0, laku: 0, rate: 0, macam: 0 };
    const dets = focus.detail_konsinyasi || [];
    const titip = dets.reduce((s, d) => s + (d.jumlah_titip || 0), 0);
    const lakuN = dets.reduce((s, d) => s + (d.jumlah_laku || 0), 0);
    return { titip, laku: lakuN, rate: titip > 0 ? Math.round((lakuN / titip) * 100) : 0, macam: dets.length };
  })();

  const belumCount = rows.filter((r) => r.status_pembayaran !== "Lunas").length;
  const lunasCount = rows.filter((r) => r.status_pembayaran === "Lunas").length;
  const aktivFocus = useMemo(
    () => aktiv.filter((a) => a.id_konsinyasi === focus?.id_konsinyasi).slice(0, 20),
    [aktiv, focus]
  );
  const toneJenis = (j) => (j === "Selesai" || j === "Pelunasan" ? "green" : j === "Laku & retur" ? "blue" : j === "Diubah" ? "yellow" : "gray");

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              Modul Titip Jual UMKM
            </p>
            <h1 className="mt-0.5 text-[22px] font-bold leading-8 tracking-tight sm:text-[28px]">
              Manajemen Konsinyasi & Reseller
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Pantau stok titipan mitra, verifikasi barang laku, dan percepat penagihan bagi hasil.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="flex h-12 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
              <Download size={16} /> Rekap PDF / Excel
            </button>
            <button type="button" onClick={() => setShowAdd(true)} className="flex h-12 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">
              <Plus size={17} strokeWidth={2.5} /> Buat Nota Titip Baru
            </button>
          </div>
        </div>

        {/* Metrik */}
        {!fiturMigrasi && (
          <div className="rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
            <b>Fitur cicilan & jatuh tempo nonaktif.</b> Jalankan ulang <span className="font-mono">db-draft.md</span> di SQL Editor Supabase untuk mengaktifkannya.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            ["Mitra Titip Aktif", `${m.mitraAktif}`, "Toko Mitra", <Store key="s" size={16} />, `${belumCount} nota berjalan`],
            ["Nilai Barang Dititip", formatRupiah(m.nilaiTitip), "", <Boxes key="b" size={16} />, `${m.totalPcsTitip} pcs tersebar`],
            ["Piutang Konsinyasi", formatRupiah(m.belum), "", <Wallet key="w" size={16} />, `Sisa tagihan • ${belumCount} nota tertunda`],
            ["Omzet Laku", formatRupiah(m.omzet), "", <TrendingUp key="t" size={16} />, `${lunasCount} nota lunas`],
          ].map(([label, value, unit, icon, foot]) => (
            <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff4ff] text-emerald-700">{icon}</span>
              </div>
              <p className="tnum mt-2 break-words text-[22px] font-bold tracking-tight">
                {loading ? "…" : value} {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
              </p>
              <p className="mt-1.5 text-xs text-slate-500">{foot}</p>
            </div>
          ))}
        </div>

        {/* Tab */}
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["nota", `Daftar Konsinyasi (Nota Titip)`, rows.length],
              ["mitra", "Data Mitra Reseller", resellerFull.length],
            ].map(([v, l, n]) => (
              <button
                key={v}
                type="button"
                onClick={() => setTab(v)}
                className={`flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-bold transition ${tab === v ? "bg-emerald-700 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}
              >
                {v === "nota" ? <FileText size={15} /> : <Users size={15} />} {l}
                <span className={`rounded-full px-1.5 text-[11px] ${tab === v ? "bg-white/20" : "bg-slate-100"}`}>{n}</span>
              </button>
            ))}
            <div className="ml-auto flex gap-1.5">
              {["Semua", ...STATUS_PEMBAYARAN].map((s) => (
                <button key={s} type="button" onClick={() => setFilter(s)} className={`h-9 rounded-lg px-3 text-xs font-bold ${filter === s ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {s}{s === "Belum Lunas" && ` (${belumCount})`}{s === "Lunas" && ` (${lunasCount})`}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
            <label className="flex h-11 flex-1 items-center gap-2 rounded-lg bg-[#eff4ff] px-3.5 focus-within:ring-2 focus-within:ring-emerald-600/25">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari No. Nota atau nama toko..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
          </div>
        </div>

        {tab === "mitra" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {resellerFull.map((r) => {
              const notas = rows.filter((x) => (x.mitra_toko?.id_mitra || x.id_mitra) === r.id_mitra);
              const tagihan = notas.filter((x) => x.status_pembayaran !== "Lunas").reduce((s, x) => s + (+x.total_tagihan || 0), 0);
              return (
                <div key={r.id_mitra} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Store size={20} />
                    </span>
                    <Badge tone={tagihan > 0 ? "yellow" : "green"}>{tagihan > 0 ? "Belum Lunas" : "Lunas"}</Badge>
                  </div>
                  <p className="mt-3 text-[15px] font-bold">{r.nama_toko}</p>
                  <p className="text-xs text-slate-500">{r.nama_pemilik || "-"}</p>
                  {r.alamat && <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{r.alamat}</p>}
                  {r.no_whatsapp && <p className="mt-1 text-xs font-semibold text-emerald-700">+{r.no_whatsapp}</p>}
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-[#eff4ff] px-3 py-2.5 text-xs">
                    <span className="text-slate-500">{notas.length} nota</span>
                    <b className="tnum">{formatRupiah(tagihan)}</b>
                  </div>
                </div>
              );
            })}
            {resellerFull.length === 0 && !loading && (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState icon={<Users size={24} />} title="Belum ada mitra" message="Tambah reseller dulu sebelum membuat nota titip." />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-12 items-start gap-5">
            {/* Nota list */}
            <section className="col-span-12 flex flex-col gap-3 xl:col-span-8">
              {loading ? (
                <p className="rounded-xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Memuat nota…</p>
              ) : error ? (
                <EmptyState icon={<Handshake size={24} />} title="Gagal" message={error} />
              ) : filtered.length === 0 ? (
                <EmptyState icon={<Handshake size={24} />} title="Kosong" message="Belum ada nota pada filter ini." />
              ) : (
                filtered.map((c) => {
                  const dets = c.detail_konsinyasi || [];
                  if (!dets.length) return null;
                  const titip = dets.reduce((s, d) => s + (d.jumlah_titip || 0), 0);
                  const lakuN = dets.reduce((s, d) => s + (d.jumlah_laku || 0), 0);
                  const returN = dets.reduce((s, d) => s + (d.jumlah_retur_bagus || 0) + (d.jumlah_retur_rusak || 0), 0);
                  const sisa = titip - lakuN - returN;
                  const lunasSt = c.status_pembayaran === "Lunas";
                  const selesaiSt = c.status_konsinyasi === "Selesai";
                  const nilaiTitip = dets.reduce((s, d) => s + (d.jumlah_titip || 0) * (d.produk?.harga_jual || 0), 0);
                  return (
                    <article
                      key={c.id_konsinyasi}
                      onClick={() => setFocusId(c.id_konsinyasi)}
                      className={`cursor-pointer rounded-xl bg-white p-4 shadow-sm ring-1 transition sm:p-5 ${focusId === c.id_konsinyasi ? "ring-2 ring-emerald-600" : "ring-slate-200/70 hover:ring-slate-300"} border-l-4 ${lunasSt ? "border-l-emerald-500" : "border-l-amber-400"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${lunasSt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"}`}>
                            <Store size={17} />
                          </span>
                          <div>
                            <p className="flex flex-wrap items-center gap-2 font-mono text-xs font-bold">
                              {c.id_konsinyasi}
                              <Badge tone={lunasSt ? "green" : "yellow"}>{c.status_pembayaran}</Badge>
                              <Badge tone={selesaiSt ? "green" : "blue"} dot={false}>{c.status_konsinyasi || "Berjalan"}</Badge>
                              {lewatTempo(c) && <Badge tone="red" dot={false}>Jatuh tempo {formatTanggal(c.jatuh_tempo)}</Badge>}
                            </p>
                            <p className="mt-1 text-sm font-bold">
                              {c.mitra_toko?.nama_toko} <span className="font-medium text-slate-400">• Titip: {formatTanggal(c.tanggal_titip)} • {dets.length} macam{c.jatuh_tempo && !lunasSt ? ` • Tempo: ${formatTanggal(c.jatuh_tempo)}` : ""}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-wider text-slate-400">Total tagihan laku</p>
                          <p className="tnum text-xl font-bold text-emerald-700">{formatRupiah(c.total_tagihan)}</p>
                          <p className="text-[11px] text-slate-400">dari {formatRupiah(nilaiTitip)} barang titip</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 rounded-lg bg-[#eff4ff] p-3">
                        {dets.map((d) => {
                          const t = d.jumlah_titip || 0;
                          const lk = d.jumlah_laku || 0;
                          const rb = d.jumlah_retur_bagus || 0;
                          const rr = d.jumlah_retur_rusak || 0;
                          const ss = t - lk - rb - rr;
                          const pc = t > 0 ? Math.round((lk / t) * 100) : 0;
                          return (
                            <div key={d.id_detail_kns}>
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <p className="min-w-0 flex-1 truncate font-bold">{d.produk?.nama_produk}</p>
                                <p className="tnum shrink-0 font-bold text-emerald-700">
                                  {lk} Laku <span className="font-medium text-slate-500">/ {t} (Sisa {ss})</span>
                                </p>
                              </div>
                              {(rb > 0 || rr > 0) && (
                                <p className="tnum mt-0.5 text-[11px] text-slate-500">Retur: {rb} bagus{rr > 0 ? `, ${rr} rusak` : ""}</p>
                              )}
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${pc}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        <p className="tnum border-t border-white pt-1.5 text-[11px] text-slate-500">
                          Total {lakuN} laku / {titip} titip ({dets.length} macam)
                        </p>
                      </div>

                      {(() => {
                        const dibayar = dibayarOf(c.id_konsinyasi);
                        const sisa = sisaOf(c);
                        const cicil = bayar.filter((b) => b.id_konsinyasi === c.id_konsinyasi);
                        if (!fiturMigrasi || (+c.total_tagihan || 0) === 0) return null;
                        return (
                          <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-slate-200">
                            <div className="flex items-center justify-between text-xs">
                              <p className="font-bold">Cicilan: <span className="tnum text-emerald-700">{formatRupiah(dibayar)}</span> <span className="font-medium text-slate-400">({cicil.length}x)</span></p>
                              <p className="font-bold">Sisa: <span className={`tnum ${sisa > 0 ? "text-red-600" : "text-emerald-700"}`}>{formatRupiah(sisa)}</span></p>
                            </div>
                            {cicil.length > 0 && (
                              <ul className="mt-1.5 space-y-1">
                                {cicil.slice(0, 3).map((b) => (
                                  <li key={b.id_pembayaran} className="tnum flex justify-between text-[11px] text-slate-500">
                                    <span>{formatTanggal(b.tanggal, true)}</span><span className="font-bold text-slate-600">{formatRupiah(b.nominal)}</span>
                                  </li>
                                ))}
                                {cicil.length > 3 && <li className="text-[11px] text-slate-400">+ {cicil.length - 3} cicilan lain…</li>}
                              </ul>
                            )}
                          </div>
                        );
                      })()}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button type="button" disabled={busy || sisa <= 0 || selesaiSt} onClick={(e) => { e.stopPropagation(); setLakuTarget(c); setShowLaku(true); }} className="flex h-10 items-center gap-1.5 rounded-lg bg-[#eff4ff] px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40">
                          Catat Laku & Retur
                        </button>
                        {fiturMigrasi && !lunasSt && (+c.total_tagihan || 0) > 0 && (
                          <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); setBayarTarget(c); setShowBayar(true); }} className="flex h-10 items-center gap-1.5 rounded-lg bg-blue-50 px-3.5 text-xs font-bold text-blue-700 hover:bg-blue-100">
                            Catat Bayar
                          </button>
                        )}
                        <button type="button" onClick={(e) => { e.stopPropagation(); waInvoice(c); }} className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                          <MessageCircle size={14} /> Invoice WA
                        </button>
                        {!lunasSt && (
                          <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); lunas(c); }} className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 text-xs font-bold text-white hover:bg-emerald-800">
                            Proses Pelunasan
                          </button>
                        )}
                        {!selesaiSt && (
                          <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); selesai(c); }} title="Tarik sisa bagus ke stok via trigger DB" className="flex h-10 items-center gap-1.5 rounded-lg bg-white px-3.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                            Selesaikan (Tarik Retur)
                          </button>
                        )}
                        <span className="ml-auto flex gap-1">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setSelected(c); setShowEdit(true); }} aria-label="Ubah" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); remove(c); }} aria-label="Hapus" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </section>

            {/* Panel kanan */}
            <aside className="col-span-12 xl:col-span-4">
              <div className="xl:sticky xl:top-20">
                {focus ? (
                  <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Mitra Prioritas</p>
                      <Badge tone={focus.status_pembayaran === "Lunas" ? "green" : "yellow"}>{focus.status_pembayaran}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2.5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Store size={20} />
                      </span>
                      <div>
                        <p className="text-[15px] font-bold leading-tight">{focus.mitra_toko?.nama_toko}</p>
                        <p className="text-xs text-slate-500">{focusReseller?.nama_pemilik || "Pemilik"}</p>
                      </div>
                    </div>
                    {focusReseller?.alamat && <p className="mt-2.5 text-xs leading-relaxed text-slate-500">{focusReseller.alamat}</p>}
                    {focusReseller?.no_whatsapp && <p className="mt-1 text-xs font-bold text-emerald-700">+{focusReseller.no_whatsapp}</p>}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => waInvoice(focus)} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800">
                        <MessageCircle size={14} /> Kirim Nota WA
                      </button>
                      <button type="button" onClick={() => window.print()} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#eff4ff] text-xs font-bold text-slate-600 hover:bg-slate-200">
                        <FileText size={14} /> Surat Jalan
                      </button>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <p className="font-bold uppercase tracking-wider text-slate-400">Performa Penjualan Mitra</p>
                        <p className="font-bold">Tingkat Laku: {focusStats.rate}%</p>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${focusStats.rate}%` }} />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-lg bg-[#eff4ff] p-2.5">
                          <p className="tnum text-sm font-bold">{focusStats.titip} pcs</p>
                          <p className="text-[11px] text-slate-500">Total Titip</p>
                        </div>
                        <div className="rounded-lg bg-[#eff4ff] p-2.5">
                          <p className="tnum text-sm font-bold text-emerald-700">{focusStats.laku} pcs</p>
                          <p className="text-[11px] text-slate-500">Laku Terjual</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="text-xs font-bold">Aktivitas Nota Ini ({aktivFocus.length})</p>
                      <p className="text-[11px] text-slate-400">Tiap pengecekan, pelunasan, dan perubahan tercatat di sini.</p>
                      {aktivFocus.length === 0 ? (
                        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] text-slate-400">Belum ada aktivitas. Catat laku/retur sekali, jejaknya muncul di sini.</p>
                      ) : (
                        <ul className="nice-scroll mt-2 max-h-[260px] space-y-0 overflow-y-auto pr-0.5">
                          {aktivFocus.map((a) => (
                            <li key={a.id_aktivitas} className="relative flex gap-2.5 pb-3 pl-1 last:pb-0">
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                              <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-1.5">
                                  <Badge tone={toneJenis(a.jenis)} dot={false}>{a.jenis}</Badge>
                                  <span className="text-[10px] text-slate-400">{formatTanggal(a.tanggal, true)}</span>
                                </p>
                                <p className="mt-0.5 text-xs leading-snug text-slate-600">{a.keterangan}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="text-xs font-bold">Daftar Nota ({rows.length})</p>
                      <ul className="nice-scroll mt-2 max-h-[320px] space-y-2 overflow-y-auto pr-0.5">
                        {rows.map((h) => (
                          <li key={h.id_konsinyasi}>
                            <button type="button" onClick={() => setFocusId(h.id_konsinyasi)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-50 ${h.id_konsinyasi === focusId ? "bg-emerald-50/60 ring-1 ring-emerald-200" : ""}`}>
                              <span>
                                <span className="block font-mono font-bold">{h.id_konsinyasi}</span>
                                <span className="text-slate-500">{formatTanggal(h.tanggal_titip)}</span>
                              </span>
                              <span className="text-right">
                                <span className="tnum block font-bold">{formatRupiah(h.total_tagihan)}</span>
                                <Badge tone={h.status_pembayaran === "Lunas" ? "green" : "yellow"}>{h.status_pembayaran === "Lunas" ? "Lunas" : "Tertunda"}</Badge>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4 flex gap-2.5 rounded-xl bg-[#eff4ff] p-3.5 text-xs leading-relaxed text-slate-600">
                      <Lightbulb size={15} className="mt-0.5 shrink-0 text-emerald-700" />
                      <p><b>Tips:</b> lakukan stock opname titipan tiap 2 minggu. Kirim invoice via WhatsApp 3 hari sebelum jatuh tempo.</p>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={<Store size={24} />} title="Pilih nota" message="Klik salah satu nota untuk melihat detail mitra." />
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      <AddKonsinyasiModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSubmit={add} submitting={busy} resellers={resellers} products={products} fiturMigrasi={fiturMigrasi} />
      <EditKonsinyasiModal key={selected?.id_konsinyasi || "edit"} isOpen={showEdit} consignment={selected} onClose={() => { setShowEdit(false); setSelected(null); }} onSubmit={editSubmit} submitting={busy} resellers={resellers} products={products} fiturMigrasi={fiturMigrasi} />
      <BarangLakuModal key={lakuTarget?.id_konsinyasi || "laku"} isOpen={showLaku} consignment={lakuTarget} submitting={busy} onClose={() => { setShowLaku(false); setLakuTarget(null); }} onSubmit={laku} />
      <BayarKonsinyasiModal isOpen={showBayar} consignment={bayarTarget} sisa={bayarTarget ? sisaOf(bayarTarget) : 0} submitting={busy} onClose={() => { setShowBayar(false); setBayarTarget(null); }} onSubmit={submitBayar} />
    </DashboardLayout>
  );
}
