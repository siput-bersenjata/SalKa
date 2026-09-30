import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KasirKu Back Office | Sistem POS & Manajemen Toko",
  description: "Dashboard monitoring transaksi, stok, laporan penjualan, dan manajemen lisensi kasir.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
