import "./globals.css";
import { CartProvider } from "@/context/CartContext";

export const metadata = {
  title: "Fefina Sweets",
  description: "Sistem Manajemen UMKM Manisan Buah Kering",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}