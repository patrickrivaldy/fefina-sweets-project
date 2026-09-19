<<<<<<< HEAD
import Sidebar from "./sidebar";
import Header from "./header";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#FFF9F4]">
      {/* Sidebar */}
      <Sidebar />

      {/* Area utama */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <Header />

        {/* Konten halaman */}
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
=======
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#FFAA48]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        <main className="flex-1 p-7">
          {children}
        </main>
      </div>
    </div>
  );
>>>>>>> origin/main
}