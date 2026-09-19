import Image from "next/image";

export default function ProductTable({ products = [] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                Produk
              </th>

              <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                HPP
              </th>

              <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                Harga Jual
              </th>

              <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                Stok
              </th>

              <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                Deskripsi
              </th>

              <th className="px-5 py-4 text-center text-sm font-semibold text-slate-700">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            {products.length > 0 ? (
              products.map((product) => (
                <tr
                  key={product.id_produk}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-orange-50/40"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50">
                        {product.foto ? (
                          <Image
                            src={product.foto}
                            alt={product.nama_produk}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">🍊</span>
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">
                          {product.nama_produk}
                        </p>

                        <p className="text-xs text-slate-400">
                          ID: {product.id_produk}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    Rp{" "}
                    {Number(product.hpp_estimasi || 0).toLocaleString("id-ID")}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-slate-800">
                    Rp {Number(product.harga_jual || 0).toLocaleString("id-ID")}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600">
                      {product.stok}
                    </span>
                  </td>

                  <td className="max-w-xs px-5 py-4 text-sm text-slate-500">
                    <p className="truncate">{product.deskripsi || "-"}</p>
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-5 py-12 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    Belum ada data produk
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Data produk akan ditampilkan di sini.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
