"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";

const categories = ["Semua", "Manisan", "Permen", "Minuman"];

export default function KasirPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("Semua");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================
  // GET / READ DATA PRODUK
  // =========================
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .gt("stok", 0);

      if (error) {
        console.error(
          "Gagal mengambil data produk:",
          error
        );

        setError("Data produk gagal dimuat.");
        setProducts([]);
      } else {
        setProducts(data || []);
      }

      setLoading(false);
    };

    loadProducts();
  }, []);

  // =========================
  // FILTER SEARCH
  // =========================
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.nama_produk
      ?.toLowerCase()
      .includes(search.toLowerCase());

    return matchesSearch;
  });

  const formatRupiah = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* =========================
            HEADER
        ========================= */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Kasir
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Pilih produk untuk memulai transaksi penjualan.
          </p>
        </div>

        {/* =========================
            SEARCH & FILTER
        ========================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Search Bar */}
          <div className="relative mb-4">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari nama produk..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
          </div>

          {/* Filter Kategori */}
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Kategori
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  disabled={category !== "Semua"}
                  onClick={() =>
                    setSelectedCategory(category)
                  }
                  title={
                    category !== "Semua"
                      ? "Filter kategori belum tersedia karena kolom kategori belum ada di database."
                      : ""
                  }
                  className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                    selectedCategory === category
                      ? "bg-orange-500 text-white shadow-sm"
                      : category !== "Semua"
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Filter kategori akan diaktifkan setelah data
              kategori tersedia pada database.
            </p>
          </div>
        </div>

        {/* =========================
            PRODUK
        ========================= */}
        <div>
          {/* Header Produk */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Produk
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Memuat data produk..."
                  : `Menampilkan ${filteredProducts.length} produk`}
              </p>
            </div>

            <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
              Semua Produk
            </span>
          </div>

          {/* =========================
              LOADING
          ========================= */}
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-2xl">
                ⏳
              </div>

              <p className="mt-4 text-sm font-medium text-slate-600">
                Memuat data produk...
              </p>
            </div>
          ) : error ? (
            /* =========================
               ERROR
            ========================= */
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">
                ⚠️
              </div>

              <h3 className="mt-4 text-lg font-semibold text-red-700">
                Data produk gagal dimuat
              </h3>

              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            /* =========================
               EMPTY STATE
            ========================= */
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
                🔍
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-800">
                Produk tidak ditemukan
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Tidak ada produk yang sesuai dengan
                pencarian.
              </p>

              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Reset Pencarian
              </button>
            </div>
          ) : (
            /* =========================
               GRID PRODUK
            ========================= */
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id_produk}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  {/* Foto Produk */}
                  <div className="flex h-44 items-center justify-center bg-orange-50">
                    {product.foto ? (
                      <img
                        src={product.foto}
                        alt={product.nama_produk}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-sm">
                        🍊
                      </div>
                    )}
                  </div>

                  {/* Informasi Produk */}
                  <div className="p-5">
                    <h3 className="mt-1 min-h-[40px] text-base font-bold text-slate-800">
                      {product.nama_produk}
                    </h3>

                    <p className="mt-4 text-lg font-bold text-slate-900">
                      {formatRupiah(product.harga_jual)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Stok: {product.stok}
                    </p>

                    <button
                      type="button"
                      className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                    >
                      Tambah
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}