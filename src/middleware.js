import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Cek sesi dari cookie LOKAL (tanpa network call) agar pindah menu cepat.
  // getUser() memang lebih ketat (validasi ke server Auth tiap request, +150-1100ms
  // dari Indonesia), tapi untuk POS internal getSession() cukup: cookie-nya JWT
  // bertanda tangan + token kedaluwarsa otomatis di-refresh oleh @supabase/ssr.
  // Trade-off: user yang baru dihapus/diblokir di Auth masih bisa browsing sampai
  // tokennya kedaluwarsa (default 1 jam). Butuh ketat? Ganti ke getUser() lagi.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/kasir/:path*",
    "/produk/:path*",
    "/produksi/:path*",
    "/bahan/:path*",
    "/stok/:path*",
    "/opname/:path*",
    "/reseller/:path*",
    "/pengguna/:path*",
    "/konsinyasi/:path*",
    "/transaksi/:path*",
    "/pengeluaran/:path*",
    "/catat-pengeluaran/:path*",
    "/laporan/:path*",
    "/pengaturan/:path*",
  ],
};