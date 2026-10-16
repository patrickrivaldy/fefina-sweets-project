"use client";

import Image from "next/image";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/layouts/DashboardLayout";
import EmptyState from "@/components/ui/EmptyState";
import CartPanel from "@/features/kasir/components/CartPanel";
import { supabase } from "@/config/supabase";
import { useCart } from "@/store/CartContext";
import { formatRupiah, wibDayBounds, todayWIB } from "@/utils/format";
import {
  Barcode,
  X,
  ArrowUpDown,
  PackageSearch,
  Plus,
  Check,
} from "lucide-react";

const SORTS = [
  { value: "nama", label: "Nama A–Z" },
  { value: "murah", label: "Termurah" },
  { value: "mahal", label: "Termahal" },
  { value: "stok", label: "Stok terbanyak" },
];

function KasirInner() {
  const params = useSearchParams();
  const { addToCart } = useCart();
  const [search, setSearch] = useState(() => params.get("q") || "");
  // sinkron bila datang dari search header saat sudah di halaman kasir
  useEffect(() => {
    setSearch(params.get("q") || "");
  }, [params]);
  const [sort, setSort] = useState("nama");
  const [showSort, setShowSort] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      const p = await supabase
        .from("produk")
        .select("id_produk, nama_produk, harga_jual, stok, foto, sku")
        .eq("is_deleted", false)
        .gt("stok", 0)
        .order("nama_produk", { ascending: true });
      if (p.error && /column|sku/i.test(p.error.message || "")) {
        const retry = await supabase
          .from("produk")
          .select("id_produk, nama_produk, harga_jual, stok, foto")
          .eq("is_deleted", false)
          .gt("stok", 0)
          .order("nama_produk", { ascending: true });
        if (retry.error) {
          setError("Tidak bisa memuat produk. Cek koneksi lalu coba lagi.");
          setProducts([]);
        } else setProducts(retry.data || []);
      } else if (p.error) {
        setError("Tidak bisa memuat produk. Cek koneksi lalu coba lagi.");
        setProducts([]);
      } else setProducts(p.data || []);
      setLoading(false);
    };
    load();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    let list = k
      ? products.filter((p) => p.nama_produk?.toLowerCase().includes(k) || p.sku?.toLowerCase().includes(k))
      : [...products];
    if (sort === "murah") list.sort((a, b) => a.harga_jual - b.harga_jual);
    else if (sort === "mahal") list.sort((a, b) => b.harga_jual - a.harga_jual);
    else if (sort === "stok") list.sort((a, b) => b.stok - a.stok);
    return list;
  }, [products, search, sort]);

  const add = (p) => {
    addToCart(p);
    setAddedId(p.id_produk);
    setTimeout(() => setAddedId(null), 800);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="grid grid-cols-12 items-start gap-5">
        {/* Kiri: katalog */}
        <section className="col-span-12 flex flex-col gap-4 xl:col-span-8">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative w-full">
                <Barcode
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ketik nama produk, SKU, atau scan barcode..."
                  className="h-11 w-full rounded-lg bg-[#eff4ff] pl-10 pr-10 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600/25"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Hapus"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSort(!showSort)}
                  className="flex h-11 items-center gap-1.5 rounded-lg bg-[#eff4ff] px-4 text-[13px] font-bold text-slate-700 hover:bg-slate-200"
                >
                  <ArrowUpDown size={15} /> Urutkan
                </button>
                {showSort && (
                  <>
                    <button
                      type="button"
                      aria-label="Tutup urutan"
                      onClick={() => setShowSort(false)}
                      className="fixed inset-0 z-20 cursor-default bg-transparent"
                    />
                    <div className="absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
                    {SORTS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => {
                          setSort(s.value);
                          setShowSort(false);
                        }}
                        className={`block w-full px-4 py-2.5 text-left text-[13px] hover:bg-slate-50 ${sort === s.value ? "font-bold text-emerald-700" : "text-slate-600"}`}
                      >
                        {s.label}
                      </button>
                    ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="no-scrollbar mt-2.5 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="whitespace-nowrap rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-sm">
                Semua ({products.length})
              </span>
              <span className="whitespace-nowrap rounded-full bg-[#eff4ff] px-4 py-1.5 text-xs font-bold text-slate-500">
                Manisan Buah
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="animate-pulse rounded-xl bg-white p-2.5 ring-1 ring-slate-200/60">
                  <div className="aspect-square rounded-lg bg-slate-100" />
                  <div className="mt-2 h-3.5 rounded bg-slate-100" />
                  <div className="mt-2 h-3.5 w-2/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={<PackageSearch size={24} />}
              title="Gagal memuat produk"
              message={error}
              action={
                <button
                  type="button"
                  onClick={() => setRefreshKey((v) => v + 1)}
                  className="h-12 rounded-lg bg-emerald-700 px-6 text-sm font-bold text-white"
                >
                  Coba lagi
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<PackageSearch size={24} />}
              title="Tidak ada hasil"
              message={search ? `Tidak ada produk bernama "${search}".` : "Semua stok habis."}
              action={search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="h-12 rounded-lg bg-emerald-700 px-6 text-sm font-bold text-white"
                >
                  Tampilkan semua
                </button>
              )}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
              {filtered.map((p) => {
                const done = addedId === p.id_produk;
                return (
                  <article
                    key={p.id_produk}
                    onClick={() => add(p)}
                    className={`group flex cursor-pointer flex-col justify-between rounded-xl bg-white p-2.5 shadow-sm transition hover:shadow-md ${
                      done ? "ring-2 ring-emerald-600" : "ring-1 ring-slate-200/70"
                    }`}
                  >
                    <div>
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                        {p.foto ? (
                          <Image
                            src={p.foto}
                            alt={p.nama_produk}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                            className="object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-4xl font-extrabold text-slate-200">
                            {p.nama_produk?.charAt(0) || "F"}
                          </span>
                        )}
                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-emerald-700 shadow-sm backdrop-blur-sm">
                          Stok: {p.stok}
                        </span>
                        {done && (
                          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Manisan
                      </p>
                      <h3 className="truncate text-[15px] font-bold leading-snug group-hover:text-emerald-700" title={p.nama_produk}>
                        {p.nama_produk}
                      </h3>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="tnum text-[15px] font-bold text-emerald-700">
                        {formatRupiah(p.harga_jual)}
                      </span>
                      <button
                        type="button"
                        aria-label="Tambah"
                        onClick={(e) => {
                          e.stopPropagation();
                          add(p);
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                          done
                            ? "bg-emerald-600 text-white"
                            : "bg-[#eff4ff] text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white"
                        }`}
                      >
                        <Plus size={17} strokeWidth={2.5} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Kanan: panel bayar */}
        <aside className="col-span-12 xl:col-span-4">
          <div className="xl:sticky xl:top-20">
            <CartPanel onPaid={() => setRefreshKey((v) => v + 1)} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function KasirPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">Memuat kasir…</div>}>
        <KasirInner />
      </Suspense>
    </DashboardLayout>
  );
}
