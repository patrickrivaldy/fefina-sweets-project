"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (event) => {
    event.preventDefault();
    setError("");

    if (email === "admin@fefina.com" && password === "123456") {
      localStorage.setItem("isLoggedIn", "true");

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }

      router.push("/");
    } else {
      setError("Email atau password yang dimasukkan salah.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF4E8] p-4 sm:p-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-2">
        {/* Bagian Kiri */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#FE7700] p-8 text-white sm:p-10 lg:p-12">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                🍊
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-wide">
                  FEFINA SWEETS
                </h1>

                <p className="text-sm text-orange-100">Sistem Manajemen UMKM</p>
              </div>
            </div>

            {/* Deskripsi Utama */}
            <div className="mt-16 max-w-md">
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                Kelola toko manisan buah kering dengan lebih mudah.
              </h2>

              <p className="mt-5 text-base leading-relaxed text-orange-50">
                Satu sistem untuk membantu mengelola produk, stok, transaksi,
                konsinyasi, pengeluaran, dan laporan usaha Fefina Sweets.
              </p>
            </div>
          </div>

          {/* Informasi Tambahan */}
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="shrink-0 text-white" />
              <p className="text-sm text-orange-50">
                Pengelolaan produk dan stok lebih teratur
              </p>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="shrink-0 text-white" />
              <p className="text-sm text-orange-50">
                Pencatatan transaksi lebih praktis
              </p>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="shrink-0 text-white" />
              <p className="text-sm text-orange-50">
                Laporan usaha dalam satu sistem
              </p>
            </div>
          </div>

          {/* Dekorasi */}
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full border-35px border-orange-300/30" />
          <div className="pointer-events-none absolute -right-16 top-24 h-40 w-40 rounded-full bg-orange-300/20" />
        </section>

        {/* Bagian Kanan */}
        <section className="flex items-center justify-center bg-white p-8 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">
                Selamat Datang!
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Masuk ke akun Anda untuk melanjutkan pengelolaan Fefina Sweets.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Input Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-base font-semibold text-slate-900"
                >
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={25}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    placeholder="Masukkan email Anda"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </div>
              </div>

              {/* Input Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-base font-semibold text-slate-900"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={25}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password Anda"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-orange-500"
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Ingat Saya dan Lupa Password */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-orange-500"
                  />

                  <span>Ingat saya</span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setError("Fitur lupa password belum tersedia.")
                  }
                  className="text-sm font-semibold text-orange-500 transition hover:text-orange-600"
                >
                  Lupa password?
                </button>
              </div>

              {/* Pesan Error */}
              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              {/* Tombol Login */}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-orange-500 py-3.5 text-base font-bold text-white transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-100"
              >
                <span>Masuk ke Sistem</span>
                <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
