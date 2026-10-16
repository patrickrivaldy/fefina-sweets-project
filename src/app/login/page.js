"use client";

import { useEffect, useState } from "react";
<<<<<<< HEAD
import { useRouter } from "next/navigation";
=======
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRole } from "@/store/RoleContext";
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
import { supabase } from "@/config/supabase";
import { Store, Mail, LockKeyhole, Eye, EyeOff, ArrowRight, ShoppingCart, Wallet, ChartColumn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
<<<<<<< HEAD
=======
  const { refresh } = useRole();
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lupa, setLupa] = useState(false);
  const [lupaMsg, setLupaMsg] = useState("");
  const [lupaBusy, setLupaBusy] = useState(false);

  // Sudah login → langsung masuk, jangan tampilkan form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        router.replace("/");
        router.refresh();
      }
    });
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError("Email atau password salah. Coba lagi.");
        setLoading(false);
        return;
      }
      if (!data?.session) {
        setError("Login berhasil tapi sesi hilang. Coba lagi.");
        setLoading(false);
        return;
      }
<<<<<<< HEAD
=======
      // Gerbang peran (toleran instalasi lama tanpa kolom baru).
      // Baris staf dicocokkan via auth_id DULU, lalu via email (identitas yang
      // sudah diverifikasi Auth) — jadi tidak perlu tempel UID manual, tidak
      // perlu daftar email pemilik, tidak ada balapan. Ketemu via email →
      // auth_id ditulis balik agar login berikut langsung cocok.
      // Masuk hanya bila baris aktif + disetujui (butuh BAGIAN 8).
      const uid = data.user.id;
      const emailLogin = (data.user.email || "").toLowerCase();
      const tolak = async (pesan) => {
        await supabase.auth.signOut();
        setError(pesan);
        setLoading(false);
      };
      const q1 = await supabase.from("pengguna").select("id_pengguna, is_deleted, is_disetujui, role_akses").eq("auth_id", uid).maybeSingle();
      let prof = null;
      let lawas = false;
      let galat = false;
      if (!q1.error) {
        prof = q1.data || null;
      } else if (/column|is_disetujui/i.test(q1.error.message || "")) {
        const q2 = await supabase.from("pengguna").select("id_pengguna, is_deleted").eq("auth_id", uid).maybeSingle();
        if (!q2.error) {
          prof = q2.data || null;
          lawas = true;
        } else galat = true;
      } else galat = true;
      if (galat) {
        await tolak("Tidak bisa memeriksa data staf. Coba lagi atau hubungi admin.");
        return;
      }
      // Gagal cocok auth_id → coba cocok email (kolom email ada bila BAGIAN 8 jalan).
      if (!prof && !lawas && emailLogin) {
        const qe = await supabase.from("pengguna").select("id_pengguna, is_deleted, is_disetujui, role_akses").eq("email", emailLogin).eq("is_deleted", false).maybeSingle();
        if (!qe.error && qe.data) {
          prof = qe.data;
          await supabase.from("pengguna").update({ auth_id: uid }).eq("id_pengguna", prof.id_pengguna);
        }
      }
      if (prof?.is_deleted) {
        await tolak("Akun ini dinonaktifkan. Hubungi admin.");
        return;
      }
      if (lawas && !prof) {
        // Instalasi lama tanpa baris: lolos via mode kompatibilitas (peran Admin).
      } else if (!lawas && (!prof || prof.is_disetujui === false)) {
        if (!prof) {
          // Auth valid tapi belum punya baris staf: daftarkan otomatis sebagai
          // pendaftar agar admin bisa acc di menu Pengguna.
          const base0 = emailLogin.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "") || "staf";
          let terdaftar = false;
          for (const uname of [base0, `${base0}.${uid.slice(0, 4)}`]) {
            const ins = await supabase.from("pengguna").insert([{
              nama_lengkap: base0, username: uname, email: emailLogin || null,
              auth_id: uid, role_akses: "Kasir", is_disetujui: false, is_deleted: false,
            }]);
            if (!ins.error) { terdaftar = true; break; }
            if (!/duplicate|unique|already exists/i.test(ins.error.message || "")) break;
          }
          await tolak(terdaftar
            ? "Akunmu otomatis didaftarkan sebagai pendaftar. Tunggu admin menyetujui, lalu masuk lagi."
            : "Akun belum terdaftar di data staf. Daftar dulu atau hubungi admin.");
          return;
        }
        await tolak("Pendaftaranmu belum disetujui admin. Tunggu kabar atau hubungi admin.");
        return;
      }
      // Segarkan peran sebelum masuk dashboard agar menu langsung sesuai (tanpa refresh manual).
      await refresh();
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
      router.replace("/");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung. Cek internet.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="grid md:grid-cols-2">
          <section className="hidden flex-col justify-between bg-emerald-700 p-8 text-white md:flex">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700">
                <Store size={22} />
              </span>
              <div className="leading-tight">
                <p className="font-extrabold tracking-tight">Fefina Sweets</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Kasir UMKM</p>
              </div>
            </div>
            <div>
              <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">
                Jualan manisan jadi gampang.
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Kasir, stok, titip ke warung, dan laporan untung — semua dalam satu layar sederhana.
              </p>
              <ul className="mt-6 space-y-3 text-[13px] font-medium text-white/80">
                {[
                  [<ShoppingCart key="a" size={16} />, "Kasir cepat + struk otomatis"],
                  [<Wallet key="b" size={16} />, "Pengeluaran tercatat rapi"],
                  [<ChartColumn key="c" size={16} />, "Laba terlihat tiap malam"],
                ].map(([icon, t], i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-emerald-300">{icon}</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[11px] text-white/40">Manisan Buah Kering · Fefina Sweets</p>
          </section>

          <section className="flex items-center p-7 sm:p-10">
            <div className="w-full">
              <div className="mb-6 flex items-center gap-3 md:hidden">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
                  <Store size={20} />
                </span>
                <p className="font-extrabold tracking-tight">Fefina Sweets</p>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">Masuk</h2>
              <p className="mt-1 text-[13px] text-slate-500">Pakai akun yang sudah didaftarkan.</p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[13px] font-bold">Email</label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} placeholder="admin@fefina.com" className="h-12 w-full rounded-xl bg-slate-100 pl-10 pr-4 text-sm font-medium outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-700 disabled:opacity-60" />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-[13px] font-bold">Password</label>
                  <div className="relative">
                    <LockKeyhole size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="password" type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} placeholder="••••••••" className="h-12 w-full rounded-xl bg-slate-100 pl-10 pr-11 text-sm font-medium outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-700 disabled:opacity-60" />
                    <button type="button" onClick={() => setShow(!show)} aria-label="Intip password" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600">
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {error && <p className="rounded-xl bg-red-50 p-3 text-[13px] font-semibold text-red-600">{error}</p>}

                <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
                  {loading ? "Masuk…" : <>Masuk <ArrowRight size={16} strokeWidth={2.5} /></>}
                </button>

<<<<<<< HEAD
=======
                <p className="text-center text-[13px] text-slate-500">
                  Belum punya akun? <Link href="/register" className="font-bold text-emerald-700 hover:underline">Daftar di sini</Link>
                </p>

>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
                <div className="text-center">
                  {!lupa ? (
                    <button type="button" onClick={() => { setLupa(true); setLupaMsg(""); }} className="text-[13px] font-bold text-emerald-700 hover:underline">
                      Lupa password?
                    </button>
                  ) : (
                    <div className="rounded-xl bg-[#eff4ff] p-3.5 text-left">
                      <p className="text-[13px] font-bold">Reset password</p>
                      <p className="mt-0.5 text-xs text-slate-500">Link reset dikirim ke email di atas (atur redirect di Supabase → Authentication → URL Configuration).</p>
                      {lupaMsg && <p className="mt-2 text-xs font-bold text-emerald-700">{lupaMsg}</p>}
                      <div className="mt-2.5 flex gap-2">
                        <button
                          type="button"
                          disabled={lupaBusy}
                          onClick={async () => {
                            setLupaBusy(true);
                            setLupaMsg("");
                            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                              redirectTo: `${window.location.origin}/login`,
                            });
                            setLupaMsg(error ? "Gagal: " + error.message : "Link reset terkirim. Cek inbox/spam.");
                            setLupaBusy(false);
                          }}
                          className="h-10 flex-1 rounded-lg bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                        >
                          {lupaBusy ? "Mengirim…" : "Kirim link"}
                        </button>
                        <button type="button" onClick={() => setLupa(false)} className="h-10 rounded-lg bg-white px-4 text-xs font-bold text-slate-600 ring-1 ring-slate-300">
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
