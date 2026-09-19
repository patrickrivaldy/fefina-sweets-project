export default function DashboardCard() {
  const cards = [
    {
      title: "Total Produk",
      value: "13",
      description: "Produk aktif",
    },
    {
      title: "Total Penjualan",
      value: "183",
      description: "Transaksi bulan ini",
    },
    {
      title: "Pendapatan",
      value: "Rp1.459.000",
      description: "Minggu ini",
    },
    {
      title: "Laba Bersih",
      value: "Rp1.110.000",
      description: "Minggu ini",
    },
  ];

  const salesData = [
    { day: "Sen", value: "45%", height: "h-24" },
    { day: "Sel", value: "65%", height: "h-36" },
    { day: "Rab", value: "50%", height: "h-28" },
    { day: "Kam", value: "80%", height: "h-44" },
    { day: "Jum", value: "60%", height: "h-32" },
    { day: "Sab", value: "90%", height: "h-52" },
    { day: "Min", value: "70%", height: "h-40" },
  ];

  return (
    <div className="space-y-6">
      {/* Empat Card Statistik */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl bg-white px-5 py-5 shadow-sm"
          >
            <p className="text-xl font-bold text-slate-900">{card.title}</p>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {card.value}
            </p>

            <p className="mt-2 text-sm font-medium text-slate-500">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      {/* Grafik Penjualan */}
      <div className="w-full rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Grafik Penjualan</h2>

          <p className="mt-2 text-base text-slate-500">
            Pantau perkembangan penjualan dalam beberapa hari terakhir.
          </p>
        </div>

        <div className="flex h-72 items-end justify-between gap-3 rounded-xl bg-orange-50 px-4 pb-4 pt-6">
          {salesData.map((item) => (
            <div
              key={item.day}
              className="flex h-full flex-1 flex-col items-center justify-end gap-3"
            >
              <div
                className={`w-full max-w-8 rounded-t-lg bg-orange-500 ${item.height}`}
                title={`Penjualan ${item.day}: ${item.value}`}
              ></div>

              <span className="text-sm text-slate-500">{item.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deskripsi Produk dalam Bentuk Tabel */}
      <div className="w-full overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">Deskripsi Produk</h2>

          <p className="mt-2 text-base text-slate-500">
            Informasi produk yang tersedia di Fefina Sweets.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-200">
                <th className="px-6 py-4 text-sm font-bold text-slate-900">
                  ID PRODUK
                </th>

                <th className="px-6 py-4 text-sm font-bold text-slate-900">
                  NAMA PRODUK
                </th>

                <th className="px-6 py-4 text-sm font-bold text-slate-900">
                  DESKRIPSI
                </th>

                <th className="px-6 py-4 text-sm font-bold text-slate-900">
                  QTY
                </th>

                <th className="px-6 py-4 text-sm font-bold text-slate-900">
                  HARGA
                </th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-6 py-4 text-sm text-slate-700">MM001</td>

                <td className="px-6 py-4 text-sm text-slate-700">
                  Manisan Mangga
                </td>

                <td className="px-6 py-4 text-sm text-slate-700">
                  Manisan buah kering dengan rasa manis dan tekstur yang lezat.
                </td>

                <td className="px-6 py-4 text-sm text-slate-700">10</td>

                <td className="px-6 py-4 text-sm text-slate-700">Rp 28.000</td>
              </tr>

              <tr className="border-b border-slate-100">
                <td className="px-6 py-4 text-sm text-slate-700">PN002</td>

                <td className="px-6 py-4 text-sm text-slate-700">
                  Manisan Nanas
                </td>

                <td className="px-6 py-4 text-sm text-slate-700">
                  Produk olahan nanas dengan cita rasa khas Fefina Sweets.
                </td>

                <td className="px-6 py-4 text-sm text-slate-700">10</td>

                <td className="px-6 py-4 text-sm text-slate-700">Rp 28.000</td>
              </tr>

              <tr className="border-b border-slate-100">
                <td className="px-6 py-4 text-sm text-slate-700">PP003</td>

                <td className="px-6 py-4 text-sm text-slate-700">
                  Manisan Pepaya
                </td>

                <td className="px-6 py-4 text-sm text-slate-700">
                  Manisan buah dengan rasa segar dan cocok dijadikan camilan.
                </td>

                <td className="px-6 py-4 text-sm text-slate-700">10</td>

                <td className="px-6 py-4 text-sm text-slate-700">Rp 28.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
