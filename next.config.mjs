/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Foto produk berasal dari Supabase Storage + foto lokal saat preview
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
      },
    ],
  },
};

export default nextConfig;
