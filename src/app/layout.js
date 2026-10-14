import "../assets/globals.css";
import { CartProvider } from "@/store/CartContext";
import { RoleProvider } from "@/store/RoleContext";

export const metadata = {
  title: "Fefina Sweets — POS & Konsinyasi",
  description:
    "Kasir, produk, konsinyasi, keuangan, dan laporan untuk UMKM manisan buah kering.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <CartProvider>
          <RoleProvider>{children}</RoleProvider>
        </CartProvider>
      </body>
    </html>
  );
}
