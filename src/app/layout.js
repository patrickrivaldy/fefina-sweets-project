import "./globals.css";

export const metadata = {
  title: "Fefina Sweets",
  description: "Sistem Manajemen UMKM Manisan Buah Kering",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
