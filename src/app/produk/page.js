"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProductTable from "@/components/produk/productTable";
import AddProductModal from "@/components/produk/addProduct";
import { supabase } from "@/lib/supabase";

export default function ProdukPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // =========================
  // GET / READ DATA PRODUK
  // =========================
  useEffect(() => {
    let ignore = false;

    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*");

      if (ignore) {
        return;
      }

      if (error) {
        console.error("Gagal mengambil data produk:", error);

        setError("Data produk gagal dimuat.");
        setProducts([]);
      } else {
        setProducts(data || []);
        setError("");
      }

      setLoading(false);
    };

    loadProducts();

    return () => {
      ignore = true;
    };
  }, []);

  // =========================
  // INSERT / TAMBAH PRODUK
  // =========================
  const handleAddProduct = async (productData) => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("products")
        .insert([productData]);

      if (error) {
        console.error("Gagal menambahkan produk:", error);

        throw new Error(
          error.message || "Produk gagal ditambahkan ke database."
        );
      }

      // Ambil kembali data produk setelah INSERT berhasil
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*");

      if (fetchError) {
        console.error(
          "Produk berhasil ditambahkan, tetapi gagal memuat ulang data:",
          fetchError
        );

        throw new Error(
          "Produk berhasil ditambahkan, tetapi data tabel gagal diperbarui."
        );
      }

      setProducts(data || []);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header halaman */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Produk
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Kelola data produk Fefina Sweets.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama produk..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          {/* Tambah Produk */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            + Tambah Produk
          </button>
        </div>

        {/* Data Produk */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Memuat data produk...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
            <p className="text-sm font-medium text-red-600">
              {error}
            </p>
          </div>
        ) : (
          <ProductTable products={products} />
        )}

        {/* Modal Tambah Produk */}
        <AddProductModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddProduct}
          submitting={submitting}
        />
      </div>
    </DashboardLayout>
  );
}