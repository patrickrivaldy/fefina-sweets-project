"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/config/supabase";
import { Store, User, AtSign, Mail, LockKeyhole, Eye, EyeOff, CheckCircle2 } from "lucide-react";

// Pendaftaran mandiri staf. Akun BARU tidak langsung aktif: baris pengguna
// dibuat dengan is_disetujui=false (dikunci policy DB "Registrasi mandiri"),
// admin meng-acc + pilih peran di menu Pengguna. Login menolak yang belum disetujui.
export default function RegisterPage() {
  const [form, setForm] = useState({ nama: "", username: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [cekEmail, setCekEmail] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const nama = form.nama.trim();
    const username = form.username.trim();
    const email = form.email.trim();
    if (!nama) return setErr("Nama lengkap wajib diisi.");
    if (username.length < 3) return setErr("Username minimal 3 karakter.");
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) return setErr("Username hanya boleh huruf, angka, titik, dan underscore (tanpa spasi).");
    if (!/.+@.+\..+/.test(email)) return setErr("Email tidak valid.");
    if (form.password.length < 6) return setErr("Password minimal 6 karakter.");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: form.password });
      if (error) {
        if (/already registered|already exists|duplicate/i.test(error.message))
          throw new Error("Email ini sudah terdaftar. Langsung masuk atau pakai email lain.");
        throw new Error(error.message);
      }
      const uid = data.user?.id;
      if (!uid) throw new Error("Akun gagal dibuat. Coba lagi.");
      const { error: pErr } = await supabase.from("pengguna").insert([{
        nama_lengkap: nama, username, email,
        auth_id: uid, role_akses: "Kasir", is_disetujui: false, is_deleted: false,
      }]);
      if (pErr) {
        if (/duplicate|unique|already exists/i.test(pErr.message))
          throw new Error("Username sudah dipakai orang lain. Ganti username lalu coba lagi.");
        if (/column|not-null|password|is_disetujui|email|policy|permission/i.test(pErr.message))
          throw new Error("Database belum siap untuk pendaftaran. Minta admin menjalankan db-draft.md BAGIAN 8.");
        throw new Error(pErr.message);
      }
      setCekEmail(!data.session);
      setSukses(true);
    } catch (e2) {
      setErr(e2.message || "Pendaftaran gagal.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "h-12 w-full rounded-xl bg-slate-100 pl-10 pr-4 text-sm font-medium outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-700 disabled:opacity-60";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center gap-3 bg-emerald-700 px-7 py-5 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Store size={20} />
          </span>
          <div className="leading-tight">
            <p className="font-extrabold tracking-tight">Fefina Sweets</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Pendaftaran Staf</p>
          </div>
        </div>

        <div className="p-7 sm:p-8">
          {sukses ? (
            <div className="text-center">
              <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
              <h2 className="mt-3 text-xl font-extrabold tracking-tight">Pendaftaran terkirim</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                Akunmu aktif setelah <b>disetujui admin</b> di menu Pengguna.
                {cekEmail && <> Cek email untuk <b>konfirmasi</b> dulu bila diminta.</>}
              </p>
              <Link href="/login" className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">
                Ke Halaman Masuk
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold tracking-tight">Daftar</h2>
              <p className="mt-1 text-[13px] text-slate-500">Isi data di bawah. Akun aktif setelah disetujui admin.</p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="nama" className="mb-1.5 block text-[13px] font-bold">Nama Lengkap</label>
                  <div className="relative">
                    <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="nama" value={form.nama} onChange={set("nama")} disabled={busy} placeholder="Nama staf" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label htmlFor="username" className="mb-1.5 block text-[13px] font-bold">Username</label>
                  <div className="relative">
                    <AtSign size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="username" value={form.username} onChange={set("username")} disabled={busy} placeholder="kasir01" className={`${inputCls} font-mono`} />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[13px] font-bold">Email</label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="email" type="email" value={form.email} onChange={set("email")} disabled={busy} placeholder="staf@fefina.com" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-[13px] font-bold">Password</label>
                  <div className="relative">
                    <LockKeyhole size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="password" type={show ? "text" : "password"} value={form.password} onChange={set("password")} disabled={busy} placeholder="Minimal 6 karakter" className={`${inputCls} pr-11`} />
                    <button type="button" onClick={() => setShow(!show)} aria-label="Intip password" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600">
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {err && <p className="rounded-xl bg-red-50 p-3 text-[13px] font-semibold text-red-600">{err}</p>}

                <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
                  {busy ? "Mendaftar…" : "Daftar"}
                </button>

                <p className="text-center text-[13px] text-slate-500">
                  Sudah punya akun? <Link href="/login" className="font-bold text-emerald-700 hover:underline">Masuk</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
