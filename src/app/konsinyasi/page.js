"use client";

import { useEffect, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import AddKonsinyasiModal from "@/components/konsinyasi/addKonsinyasi";
import EditKonsinyasiModal from "@/components/konsinyasi/editKonsinyasi";
import { supabase } from "@/lib/supabase";

export default function KonsinyasiPage() {
  const [search, setSearch] = useState("");

  const [consignments, setConsignments] =
    useState([]);

  const [resellers, setResellers] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [selectedConsignment, setSelectedConsignment] =
    useState(null);

  const [submitting, setSubmitting] =
    useState(false);

  // =========================
  // FORMAT RUPIAH
  // =========================
  const formatRupiah = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // =========================
  // READ DATA KONSINYASI
  // =========================
  const loadConsignments = async () => {
    const { data, error } = await supabase
      .from("consignments")
      .select(`
        id_konsinyasi,
        tanggal_titip,
        status_pembayaran,
        total_tagihan,
        id_reseller,
        resellers (
          nama_toko
        ),
        consignment_details (
          id_detail_kns,
          jumlah_titip,
          jumlah_laku,
          subtotal,
          id_produk,
          products (
            nama_produk,
            harga_jual
          )
        )
      `)
      .order("tanggal_titip", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Gagal mengambil data konsinyasi:",
        error
      );

      setError(
        "Data konsinyasi gagal dimuat."
      );

      setConsignments([]);
      return;
    }

    setConsignments(data || []);
    setError("");
  };

  // =========================
  // READ RESELLER & PRODUCT
  // =========================
  const loadFormData = async () => {
    const [
      resellerResult,
      productResult,
    ] = await Promise.all([
      supabase
        .from("resellers")
        .select(
          "id_reseller, nama_toko"
        )
        .eq("is_active", true)
        .order("nama_toko", {
          ascending: true,
        }),

      supabase
        .from("products")
        .select(
          "id_produk, nama_produk, harga_jual"
        )
        .eq("is_active", true)
        .order("nama_produk", {
          ascending: true,
        }),
    ]);

    if (resellerResult.error) {
      console.error(
        "Gagal mengambil data reseller:",
        resellerResult.error
      );
    } else {
      setResellers(
        resellerResult.data || []
      );
    }

    if (productResult.error) {
      console.error(
        "Gagal mengambil data produk:",
        productResult.error
      );
    } else {
      setProducts(
        productResult.data || []
      );
    }
  };

  // =========================
  // LOAD DATA
  // =========================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      await Promise.all([
        loadConsignments(),
        loadFormData(),
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // =========================
  // INSERT KONSINYASI
  // =========================
  const handleAddKonsinyasi = async (
    konsinyasiData
  ) => {
    setSubmitting(true);

    try {
      const idKonsinyasi =
        `KNS-${Date.now()}`;

      // =========================
      // INSERT CONSIGNMENTS
      // =========================
      const {
        data: consignment,
        error: consignmentError,
      } = await supabase
        .from("consignments")
        .insert([
          {
            id_konsinyasi:
              idKonsinyasi,

            tanggal_titip:
              konsinyasiData.tanggal_titip,

            status_pembayaran:
              konsinyasiData.status_pembayaran,

            total_tagihan:
              konsinyasiData.subtotal,

            id_reseller:
              konsinyasiData.id_reseller,
          },
        ])
        .select()
        .single();

      if (consignmentError) {
        console.error(
          "Gagal menambahkan konsinyasi:",
          consignmentError
        );

        throw new Error(
          consignmentError.message ||
            "Data konsinyasi gagal ditambahkan."
        );
      }

      // =========================
      // INSERT DETAIL
      // =========================
      const {
        error: detailError,
      } = await supabase
        .from("consignment_details")
        .insert([
          {
            id_konsinyasi:
              consignment.id_konsinyasi,

            id_produk:
              konsinyasiData.id_produk,

            jumlah_titip:
              konsinyasiData.jumlah_titip,

            jumlah_laku:
              konsinyasiData.jumlah_laku,

            subtotal:
              konsinyasiData.subtotal,
          },
        ]);

      if (detailError) {
        console.error(
          "Gagal menambahkan detail konsinyasi:",
          detailError
        );

        throw new Error(
          detailError.message ||
            "Detail konsinyasi gagal ditambahkan."
        );
      }

      await loadConsignments();

      setShowAddModal(false);
    } catch (error) {
      console.error(
        "Gagal menambahkan konsinyasi:",
        error
      );

      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // PILIH DATA UNTUK EDIT
  // =========================
  const handleEditKonsinyasi = (
    consignment
  ) => {
    setSelectedConsignment(
      consignment
    );

    setShowEditModal(true);
  };

  // =========================
  // UPDATE KONSINYASI
  // =========================
  const handleEditKonsinyasiSubmit =
    async (konsinyasiData) => {
      setSubmitting(true);

      try {
        // =========================
        // UPDATE CONSIGNMENTS
        // =========================
        const {
          error: consignmentError,
        } = await supabase
          .from("consignments")
          .update({
            tanggal_titip:
              konsinyasiData.tanggal_titip,

            status_pembayaran:
              konsinyasiData.status_pembayaran,

            total_tagihan:
              konsinyasiData.total_tagihan,

            id_reseller:
              konsinyasiData.id_reseller,
          })
          .eq(
            "id_konsinyasi",
            konsinyasiData.id_konsinyasi
          );

        if (consignmentError) {
          console.error(
            "Gagal memperbarui konsinyasi:",
            consignmentError
          );

          throw new Error(
            consignmentError.message ||
              "Konsinyasi gagal diperbarui."
          );
        }

        // =========================
        // UPDATE DETAIL
        // =========================
        const {
          error: detailError,
        } = await supabase
          .from("consignment_details")
          .update({
            id_produk:
              konsinyasiData.id_produk,

            jumlah_titip:
              konsinyasiData.jumlah_titip,

            jumlah_laku:
              konsinyasiData.jumlah_laku,

            subtotal:
              konsinyasiData.total_tagihan,
          })
          .eq(
            "id_konsinyasi",
            konsinyasiData.id_konsinyasi
          );

        if (detailError) {
          console.error(
            "Gagal memperbarui detail konsinyasi:",
            detailError
          );

          throw new Error(
            detailError.message ||
              "Detail konsinyasi gagal diperbarui."
          );
        }

        // =========================
        // REFRESH
        // =========================
        await loadConsignments();

        setShowEditModal(false);
        setSelectedConsignment(
          null
        );
      } catch (error) {
        console.error(
          "Gagal memperbarui konsinyasi:",
          error
        );

        throw error;
      } finally {
        setSubmitting(false);
      }
    };

  // =========================
  // DELETE KONSINYASI
  // =========================
  const handleDeleteKonsinyasi =
    async (consignment) => {
      const confirmed = window.confirm(
        `Apakah Anda yakin ingin menghapus konsinyasi "${consignment.id_konsinyasi}"?`
      );

      if (!confirmed) {
        return;
      }

      setSubmitting(true);

      try {
        // =========================
        // HAPUS DETAIL
        // =========================
        const {
          error: detailError,
        } = await supabase
          .from("consignment_details")
          .delete()
          .eq(
            "id_konsinyasi",
            consignment.id_konsinyasi
          );

        if (detailError) {
          console.error(
            "Gagal menghapus detail konsinyasi:",
            detailError
          );

          throw new Error(
            detailError.message ||
              "Detail konsinyasi gagal dihapus."
          );
        }

        // =========================
        // HAPUS DATA UTAMA
        // =========================
        const {
          error: consignmentError,
        } = await supabase
          .from("consignments")
          .delete()
          .eq(
            "id_konsinyasi",
            consignment.id_konsinyasi
          );

        if (consignmentError) {
          console.error(
            "Gagal menghapus konsinyasi:",
            consignmentError
          );

          throw new Error(
            consignmentError.message ||
              "Konsinyasi gagal dihapus."
          );
        }

        // =========================
        // REFRESH
        // =========================
        await loadConsignments();
      } catch (error) {
        console.error(
          "Gagal menghapus konsinyasi:",
          error
        );

        alert(
          error.message ||
            "Konsinyasi gagal dihapus."
        );
      } finally {
        setSubmitting(false);
      }
    };

  // =========================
  // FILTER SEARCH
  // =========================
  const filteredConsignments =
    consignments.filter((consignment) => {
      const keyword =
        search.toLowerCase();

      const namaToko =
        consignment.resellers
          ?.nama_toko
          ?.toLowerCase() || "";

      const details =
        consignment.consignment_details ||
        [];

      const namaProduk =
        details
          .map(
            (detail) =>
              detail.products
                ?.nama_produk
                ?.toLowerCase() || ""
          )
          .join(" ");

      return (
        namaToko.includes(keyword) ||
        namaProduk.includes(keyword) ||
        consignment.id_konsinyasi
          ?.toLowerCase()
          .includes(keyword)
      );
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* =========================
            HEADER
        ========================= */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Konsinyasi
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Kelola penitipan produk kepada reseller atau agen konsinyasi.
          </p>
        </div>

        {/* =========================
            TOOLBAR
        ========================= */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Cari ID, reseller, atau produk..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 sm:max-w-md"
          />

          <button
            type="button"
            onClick={() =>
              setShowAddModal(true)
            }
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            + Tambah Konsinyasi
          </button>
        </div>

        {/* =========================
            DATA
        ========================= */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Memuat data konsinyasi...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
            <p className="text-sm font-medium text-red-600">
              {error}
            </p>
          </div>
        ) : filteredConsignments.length ===
          0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-3xl">
              📦
            </div>

            <h3 className="mt-5 text-lg font-semibold text-slate-800">
              {search.trim()
                ? "Konsinyasi tidak ditemukan"
                : "Belum ada data konsinyasi"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {search.trim()
                ? "Tidak ada data yang sesuai dengan pencarian."
                : "Belum ada transaksi konsinyasi yang tersedia."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      ID Konsinyasi
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Reseller
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Produk
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Tanggal Titip
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Jumlah Titip
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Jumlah Laku
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Sisa
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Total Penjualan
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Pembayaran
                    </th>

                    <th className="px-5 py-4 text-sm font-semibold text-slate-700">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredConsignments.map(
                    (consignment) => {
                      const detail =
                        consignment
                          .consignment_details?.[0];

                      if (!detail) {
                        return null;
                      }

                      const jumlahTitip =
                        detail.jumlah_titip ||
                        0;

                      const jumlahLaku =
                        detail.jumlah_laku ||
                        0;

                      const sisa =
                        jumlahTitip -
                        jumlahLaku;

                      return (
                        <tr
                          key={
                            consignment.id_konsinyasi
                          }
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                        >
                          {/* ID */}
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {
                                consignment.id_konsinyasi
                              }
                            </p>
                          </td>

                          {/* RESELLER */}
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {consignment
                              .resellers
                              ?.nama_toko ||
                              "-"}
                          </td>

                          {/* PRODUK */}
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {detail.products
                                ?.nama_produk ||
                                "-"}
                            </p>
                          </td>

                          {/* TANGGAL */}
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {new Date(
                              consignment.tanggal_titip
                            ).toLocaleDateString(
                              "id-ID"
                            )}
                          </td>

                          {/* JUMLAH TITIP */}
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {jumlahTitip}
                          </td>

                          {/* JUMLAH LAKU */}
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {jumlahLaku}
                          </td>

                          {/* SISA */}
                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                            {sisa}
                          </td>

                          {/* TOTAL PENJUALAN */}
                          <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                            {formatRupiah(
                              detail.subtotal
                            )}
                          </td>

                          {/* PEMBAYARAN */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                consignment.status_pembayaran ===
                                "Lunas"
                                  ? "bg-green-50 text-green-600"
                                  : "bg-yellow-50 text-yellow-600"
                              }`}
                            >
                              {
                                consignment.status_pembayaran
                              }
                            </span>
                          </td>

                          {/* AKSI */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleEditKonsinyasi(
                                    consignment
                                  )
                                }
                                disabled={
                                  submitting
                                }
                                className="rounded-lg px-3 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-50 disabled:opacity-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteKonsinyasi(
                                    consignment
                                  )
                                }
                                disabled={
                                  submitting
                                }
                                className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* =========================
          MODAL TAMBAH
      ========================= */}
      <AddKonsinyasiModal
        isOpen={showAddModal}
        onClose={() =>
          setShowAddModal(false)
        }
        onSubmit={handleAddKonsinyasi}
        submitting={submitting}
        resellers={resellers}
        products={products}
      />

      {/* =========================
          MODAL EDIT
      ========================= */}
      <EditKonsinyasiModal
        key={
          selectedConsignment?.id_konsinyasi ||
          "edit-konsinyasi"
        }
        isOpen={showEditModal}
        consignment={selectedConsignment}
        onClose={() => {
          setShowEditModal(false);
          setSelectedConsignment(null);
        }}
        onSubmit={
          handleEditKonsinyasiSubmit
        }
        submitting={submitting}
        resellers={resellers}
        products={products}
      />
    </DashboardLayout>
  );
}