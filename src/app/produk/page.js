"use client";

import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProductTable from "@/components/produk/productTable";
import AddProductModal from "@/components/produk/addProduct";
import EditProductModal from "@/components/produk/editProduct";
import { supabase } from "@/lib/supabase";

export default function ProdukPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // =========================
  // PILIH PRODUK UNTUK EDIT
  // =========================
  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  // =========================
  // HAPUS / NONAKTIFKAN PRODUK
  // =========================
  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus produk "${product.nama_produk}"?`
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          is_active: false,
        })
        .eq("id_produk", product.id_produk);

      if (error) {
        console.error(
          "Gagal menghapus produk:",
          error
        );

        throw new Error(
          error.message ||
            "Produk gagal dihapus."
        );
      }

      // Ambil kembali data produk
      const { data, error: fetchError } =
        await supabase
          .from("products")
          .select("*");

      if (fetchError) {
        console.error(
          "Produk berhasil dinonaktifkan, tetapi gagal memuat ulang data:",
          fetchError
        );

        throw new Error(
          "Produk berhasil dihapus, tetapi data tabel gagal diperbarui."
        );
      }

      setProducts(data || []);

      // Toast sukses
      showToast(
        "success",
        "Produk berhasil dihapus."
      );
    } catch (error) {
      console.error(
        "Gagal menghapus produk:",
        error
      );

      showToast(
        "error",
        error.message ||
          "Produk gagal dihapus."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // TOAST NOTIFICATION
  // =========================
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (type, message) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({
      type,
      message,
    });

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 5000);
  };

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
        console.error(
          "Gagal mengambil data produk:",
          error
        );

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
        console.error(
          "Gagal menambahkan produk:",
          error
        );

        throw new Error(
          error.message ||
            "Produk gagal ditambahkan ke database."
        );
      }

      // Ambil kembali data produk setelah INSERT berhasil
      const { data, error: fetchError } =
        await supabase
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

      // Toast sukses
      showToast(
        "success",
        "Produk berhasil ditambahkan."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // UPDATE / EDIT PRODUK
  // =========================
  const handleEditProductSubmit = async (productData) => {
    setSubmitting(true);

    try {
      const {
        id_produk,
        imageFile,
        ...updateData
      } = productData;

      // =========================
      // UPLOAD FOTO BARU
      // =========================
      if (imageFile) {
        const fileExtension =
          imageFile.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const fileName = `${crypto.randomUUID()}.${fileExtension}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("foto-produk")
            .upload(filePath, imageFile, {
              cacheControl: "3600",
              upsert: false,
              contentType: imageFile.type,
            });

        if (uploadError) {
          console.error(
            "Gagal upload foto produk:",
            uploadError
          );

          throw new Error(
            uploadError.message ||
              "Foto produk gagal diupload."
          );
        }

        // =========================
        // AMBIL PUBLIC URL FOTO
        // =========================
        const { data: publicUrlData } =
          supabase.storage
            .from("foto-produk")
            .getPublicUrl(filePath);

        updateData.foto =
          publicUrlData.publicUrl;
      }

      // =========================
      // UPDATE DATA PRODUK
      // =========================
      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id_produk", id_produk);

      if (error) {
        console.error(
          "Gagal memperbarui produk:",
          error
        );

        throw new Error(
          error.message ||
            "Produk gagal diperbarui."
        );
      }

      // =========================
      // AMBIL ULANG DATA PRODUK
      // =========================
      const { data, error: fetchError } =
        await supabase
          .from("products")
          .select("*");

      if (fetchError) {
        console.error(
          "Produk berhasil diperbarui, tetapi gagal memuat ulang data:",
          fetchError
        );

        throw new Error(
          "Produk berhasil diperbarui, tetapi data tabel gagal diperbarui."
        );
      }

      setProducts(data || []);

      // =========================
      // TUTUP MODAL
      // =========================
      setShowEditModal(false);
      setSelectedProduct(null);

      // =========================
      // TOAST SUKSES
      // =========================
      showToast(
        "success",
        imageFile
          ? "Produk dan foto berhasil diperbarui."
          : "Produk berhasil diperbarui."
      );
    } catch (error) {
      console.error(
        "Gagal memperbarui produk:",
        error
      );

      showToast(
        "error",
        error.message ||
          "Produk gagal diperbarui."
      );

      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // FILTER SEARCH PRODUK
  // =========================
  const filteredProducts = products.filter((product) =>
    product.nama_produk
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      {/* =========================
          TOAST NOTIFICATION
      ========================= */}
      {toast && (
        <div className="fixed right-6 top-6 z-100">
          <div
            className={`flex min-w-[320px] items-start gap-3 rounded-xl border px-4 py-4 shadow-lg ${
              toast.type === "success"
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            {/* Icon */}
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                toast.type === "success"
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {toast.type === "success"
                ? "✓"
                : "!"}
            </div>

            {/* Isi Toast */}
            <div className="flex-1">
              <p
                className={`text-sm font-semibold ${
                  toast.type === "success"
                    ? "text-green-800"
                    : "text-red-800"
                }`}
              >
                {toast.type === "success"
                  ? "Berhasil"
                  : "Gagal"}
              </p>

              <p
                className={`mt-1 text-sm ${
                  toast.type === "success"
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {toast.message}
              </p>
            </div>

            {/* Tombol Tutup Toast */}
            <button
              type="button"
              onClick={() => {
                if (toastTimerRef.current) {
                  clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = null;
                }

                setToast(null);
              }}
              className={`text-lg leading-none ${
                toast.type === "success"
                  ? "text-green-500 hover:text-green-700"
                  : "text-red-500 hover:text-red-700"
              }`}
              aria-label="Tutup notifikasi"
            >
              ×
            </button>
          </div>
        </div>
      )}

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
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari nama produk..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          {/* Tambah Produk */}
          <button
            type="button"
            onClick={() =>
              setShowAddModal(true)
            }
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
        ) : filteredProducts.length === 0 ? (
          search.trim() ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
                🔍
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-800">
                Produk tidak ditemukan
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Tidak ada produk yang sesuai dengan
                pencarian{" "}
                <span className="font-medium text-slate-700">
                  &ldquo;{search}&rdquo;
                </span>
                .
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
                📦
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-800">
                Belum ada produk
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Belum ada data produk yang tersedia, silahkan tambahkan produk.
              </p>
            </div>
          )
        ) : (
          <ProductTable
            products={filteredProducts}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
          />
        )}

        {/* Modal Tambah Produk */}
        <AddProductModal
          isOpen={showAddModal}
          onClose={() =>
            setShowAddModal(false)
          }
          onSubmit={handleAddProduct}
          submitting={submitting}
          onToast={showToast}
        />

        {/* Modal Edit Produk */}
        <EditProductModal
          key={
            selectedProduct?.id_produk ||
            "edit-product"
          }
          isOpen={showEditModal}
          product={selectedProduct}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          onSubmit={handleEditProductSubmit}
          submitting={submitting}
        />
      </div>
    </DashboardLayout>
  );
}