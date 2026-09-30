# KasirKu (SalKa) Backend API & Web Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun REST API backend lengkap dan Web Dashboard Back Office (KasirKu / SalKa) dengan Next.js, Prisma, PostgreSQL/Neon, sistem trial 30 hari otomatis, manajemen akun kasir oleh Super Admin, visualisasi laporan transaksi & stok sesuai mockup, push ke GitHub `siput-bersenjata/SalKa`, dan deploy live ke Vercel.

**Architecture:** Next.js 14+ App Router bertindak sebagai full-stack server yang menyajikan halaman Web Dashboard (admin & kasir) dan REST API JSON endpoints untuk dikonsumsi oleh aplikasi mobile Android Flutter. Prisma ORM mengelola basis data multi-tenant dengan isolasi data per toko serta verifikasi status masa aktif (trial/subscription).

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL (Neon/Vercel Postgres), JWT (jose/jsonwebtoken), bcryptjs, Lucide Icons, Recharts.

**Spec:** `docs/superpowers/specs/2026-09-30-kasirku-salka-design.md`

## Global Constraints
- Target GitHub: `https://github.com/siput-bersenjata/SalKa.git`
- Target Vercel: Project `salka` di team `salshya`
- Bahasa UI: Bahasa Indonesia (sesuai referensi mockup KasirKu)
- Multi-tenancy: Semua data produk, transaksi, dan pengaturan struk terikat pada `storeId`
- Trial Rules: Akun baru otomatis mendapatkan trial 30 hari; jika kedaluwarsa, akun tetap dapat membaca data lama namun diblokir dari membuat transaksi baru / menambah produk
- Super Admin: Memiliki wewenang untuk mengatur / memperpanjang batas waktu aktif akun kasir mana pun

---

### Task 1: Scaffolding Proyek Next.js 14 & Konfigurasi Dasar

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.mjs`, `.gitignore`, `.env.example`, `.env`

**Interfaces:**
- Produces: Lingkungan Next.js 14 App Router yang dapat di-build dan di-run lokal (`npm run dev`) serta siap deploy ke Vercel.

- [ ] **Step 1: Inisialisasi package.json dan instalasi dependencies inti**
  Dependencies: `next`, `react`, `react-dom`, `@prisma/client`, `prisma`, `bcryptjs`, `jsonwebtoken`, `lucide-react`, `clsx`, `tailwind-merge`, `recharts` (atau custom SVG chart), `date-fns`.
  DevDependencies: `typescript`, `@types/node`, `@types/react`, `@types/bcryptjs`, `@types/jsonwebtoken`, `tailwindcss`, `postcss`, `autoprefixer`.

- [ ] **Step 2: Buat konfigurasi Next.js, TypeScript, dan Tailwind CSS**
  Pastikan `tailwind.config.ts` dan `next.config.mjs` terkonfigurasi dengan path `./src/**/*.{ts,tsx}`.

- [ ] **Step 3: Setup file .gitignore dan .env.example**
  Pastikan `node_modules`, `.next`, `.env` diabaikan oleh git. Siapkan format `DATABASE_URL` dan `JWT_SECRET`.

- [ ] **Step 4: Verifikasi build lokal**
  Jalankan `npm run build` atau `npx next build` untuk memastikan konfigurasi bebas error syntax.

- [ ] **Step 5: Commit scaffolding dasar**
  `git add . && git commit -m "chore: scaffold Next.js 14 App Router project for SalKa"`

---

### Task 2: Skema Basis Data Prisma & Script Seed Data Awal

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `prisma/seed.ts`

**Interfaces:**
- Produces: Singleton Prisma Client (`prisma`) untuk koneksi database.
- Produces: Seed script yang membuat akun Super Admin default (`admin` / `admin123`) serta contoh akun toko kasir (`kasir1` / `kasir123`) dengan 30 hari trial dan produk awal.

- [ ] **Step 1: Tulis prisma/schema.prisma**
  Model lengkap: `User` (role, accountStatus, trialExpiresAt, subscriptionUntil), `Store` (name, address, paperSize, receiptHeader, receiptFooter), `Category`, `Product`, `Transaction`, `TransactionItem`.

- [ ] **Step 2: Buat singleton Prisma client di `src/lib/prisma.ts`**
  Mencegah multiple connection pool saat hot-reloading di development maupun di serverless Vercel.

- [ ] **Step 3: Buat script `prisma/seed.ts`**
  Membuat Super Admin `admin` dan akun Kasir Demo dengan produk sampel (Air Mineral 600ml, Teh Botol, Indomie Goreng, Roti Tawar, Kopi Sachet, Susu UHT) sesuai gambar mockup.

- [ ] **Step 4: Jalankan `prisma generate` dan `prisma db push` / `prisma db seed`**
  Verifikasi model ter-compile dan tabel terbentuk.

- [ ] **Step 5: Commit skema database**
  `git add prisma src/lib/prisma.ts && git commit -m "feat(db): add Prisma schema and seed script"`

---

### Task 3: Modul Autentikasi JWT & Logika Trial Expiration

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/trial.ts`
- Create: `src/types/index.ts`

**Interfaces:**
- Produces: `hashPassword(password)`, `comparePassword(password, hash)`
- Produces: `signToken(payload)`, `verifyToken(token)`
- Produces: `checkAccountStatus(user)`: mengembalikan `{ isExpired: boolean, status: string, daysRemaining: number, expiresAt: Date }`

- [ ] **Step 1: Tulis tipe data TypeScript di `src/types/index.ts`**
  Mendefinisikan UserSession, StoreProfile, ProductItem, TransactionPayload, TrialInfo.

- [ ] **Step 2: Tulis `src/lib/auth.ts`**
  Implementasi hashing dengan `bcryptjs` dan token JWT dengan masa berlaku fleksibel.

- [ ] **Step 3: Tulis `src/lib/trial.ts`**
  Logika evaluasi masa aktif:
  - Cek `subscriptionUntil`: jika diisi oleh Super Admin dan belum lewat, maka `status = 'ACTIVE'`.
  - Jika tidak ada `subscriptionUntil`, cek `trialExpiresAt` (30 hari sejak daftar).
  - Jika tanggal sekarang > tanggal kadaluwarsa, tandai `isExpired = true`, `status = 'EXPIRED'`.

- [ ] **Step 4: Verifikasi logika trial dengan skrip pengujian cepat**
  Pastikan user baru mendapatkan sisa 30 hari, user yang tanggal kadaluwarsanya kemarin mengembalikan `isExpired = true`.

- [ ] **Step 5: Commit modul autentikasi dan trial**
  `git add src/lib/auth.ts src/lib/trial.ts src/types/index.ts && git commit -m "feat(auth): implement JWT auth and 30-day trial calculation logic"`

---

### Task 4: REST API Endpoints Lengkap (Auth, Admin, Produk, Transaksi, Laporan)

**Files:**
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/app/api/store/profile/route.ts`
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[id]/route.ts`
- Create: `src/app/api/transactions/route.ts`
- Create: `src/app/api/reports/summary/route.ts`
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[id]/extend/route.ts`
- Create: `src/app/api/admin/transactions/route.ts`

**Interfaces:**
- Produces: REST API standar JSON yang siap digunakan langsung oleh aplikasi Android Flutter dan Web Dashboard.
- Constraints: Penolakan transaksi (`403 Forbidden`) jika `checkAccountStatus` mengembalikan `isExpired = true` dengan pesan ramah *"Masa aktif akun Anda telah berakhir. Silakan hubungi Admin untuk perpanjangan."*

- [ ] **Step 1: Implementasi API Autentikasi (`/api/auth/*`)**
  - Register: Membuat User baru dengan role `STORE_OWNER`, toko default, dan `trialExpiresAt = now + 30 days`.
  - Login: Validasi kredensial, kembalikan JWT token + data toko + status trial.
  - Me: Cek profil user dan status trial saat ini.

- [ ] **Step 2: Implementasi API Pengaturan Toko & Struk (`/api/store/profile`)**
  - GET: Dapatkan nama toko, alamat, nomor telepon, ukuran kertas (58mm/80mm), header/footer struk.
  - PUT: Update profil toko dan format struk.

- [ ] **Step 3: Implementasi API Produk & Kategori (`/api/products`)**
  - GET: List produk berdasarkan filter kategori dan pencarian keyword nama/barcode.
  - POST: Tambah produk (dibatasi jika akun expired).
  - PUT/DELETE: Update harga, nama, kategori, dan stok produk.

- [ ] **Step 4: Implementasi API Transaksi Kasir (`/api/transactions`)**
  - POST: Checkout transaksi. Divalidasi terhadap status trial. Mengurangi stok produk secara atomik (`prisma.$transaction`), membuat invoice unik `TRX-YYYYMMDD-XXXX`.
  - GET: Riwayat transaksi dengan filter tanggal dan pagination.

- [ ] **Step 5: Implementasi API Laporan & Ringkasan (`/api/reports/summary`)**
  - Mengembalikan: Total Pendapatan, Total Transaksi, Total Item Terjual, Jumlah Stok Menipis, Grafik penjualan 7 hari terakhir, Persentase metode pembayaran, dan Produk terlaris.

- [ ] **Step 6: Implementasi API Super Admin (`/api/admin/*`)**
  - `/api/admin/users`: List seluruh akun kasir, tanggal kedaluwarsa, dan sisa hari trial.
  - `/api/admin/users/[id]/extend`: Ubah batas waktu akun (misal: tambah 30 hari, 1 tahun, atau set tanggal spesifik).
  - `/api/admin/transactions`: Rekap transaksi seluruh toko.

- [ ] **Step 7: Verifikasi seluruh endpoint API dengan request test**
  Uji alur register -> login -> buat produk -> transaksi -> cek ringkasan laporan -> uji perpanjangan akun oleh admin.

- [ ] **Step 8: Commit API endpoints**
  `git add src/app/api && git commit -m "feat(api): implement complete REST API for mobile app and back office"`

---

### Task 5: Web Dashboard Back Office UI (Sesuai Mockup Gambar KasirKu)

**Files:**
- Create: `src/app/layout.tsx`, `src/app/page.tsx` (Dashboard Overview)
- Create: `src/app/login/page.tsx`, `src/app/register/page.tsx`
- Create: `src/app/admin/users/page.tsx` (Manajemen Akun & Masa Aktif Trial)
- Create: `src/app/produk/page.tsx` (Katalog Produk & Manajemen Stok)
- Create: `src/app/transaksi/page.tsx` (Daftar & Detail Transaksi)
- Create: `src/app/laporan/page.tsx` (Laporan Lengkap & Analisis Penjualan)
- Create: `src/app/pengaturan/page.tsx` (Pengaturan Toko & Printer Kertas Struk 58mm/80mm)
- Create: Komponen UI: `Sidebar.tsx`, `Navbar.tsx`, `StatCard.tsx`, `SalesChart.tsx`, `CategoryPieChart.tsx`, `LowStockWidget.tsx`, `RecentTransactionsTable.tsx`, `ExtendTrialModal.tsx`

**Interfaces:**
- Produces: Antarmuka Web Dashboard profesional modern (Dark Navy sidebar `#0F172A`, White/Soft-slate background `#F8FAFC`, Blue primary `#2563EB`) identik dengan gambar mockup yang diberikan user.

- [ ] **Step 1: Buat Sidebar & Navbar responsif**
  Sidebar dengan navigasi: Dashboard, Transaksi, Produk & Stok, Laporan, Manajemen Akun (khusus Admin), Pengaturan Toko. Indikator Sistem Online (hijau) dan versi v1.0.0 di bagian bawah sidebar.

- [ ] **Step 2: Buat Halaman Dashboard Utama (`/`)**
  Sesuai Mockup Gambar 1:
  - 4 Kartu Metrik: Total Transaksi (48, +12%), Total Pendapatan (Rp 2.485.000, +18%), Total Item Terjual (132, +16%), Stok Menipis (5 produk).
  - Grafik Garis Penjualan 7 Hari Terakhir (interaktif dan halus).
  - Donut Chart Penjualan per Kategori (Minuman, Makanan, Snack, Rokok, Lainnya).
  - Widget Peringatan Produk Stok Menipis (list produk dengan badge sisa pcs warna merah/oranye).
  - Tabel Transaksi Terbaru (No. Transaksi, Tanggal & Waktu, Total Rp, Metode Tunai/QRIS/Debit, Status Selesai hijau).
  - Tabel Stok Produk ringkas.

- [ ] **Step 3: Buat Halaman Manajemen Akun & Lisensi (`/admin/users`)**
  Tabel seluruh toko/kasir yang terdaftar:
  - Kolom: Username, Nama Toko, Tanggal Daftar, Status (TRIAL / AKTIF / KADALUWARSA), Sisa Waktu, Batas Masa Aktif.
  - Tombol Aksi: "Setel Masa Aktif" / "Perpanjang".
  - Modal Penyetelan: Pilihan cepat (+1 Bulan, +3 Bulan, +6 Bulan, +1 Tahun, Aktif Permanen, atau Custom Date).

- [ ] **Step 4: Buat Halaman Produk & Stok (`/produk`)**
  - Pencarian produk, filter kategori (Semua, Minuman, Makanan, Lainnya).
  - Modal Tambah & Edit Produk: Nama, Kategori, Harga Jual, Harga Modal, Stok Awal, Minimum Stok (peringatan).
  - Tombol update stok cepat.

- [ ] **Step 5: Buat Halaman Transaksi & Struk Belanja (`/transaksi`)**
  - Riwayat transaksi lengkap dengan filter tanggal dan metode pembayaran.
  - Modal detail transaksi & preview struk belanja termal (58mm/80mm) yang bisa dicetak langsung via browser.

- [ ] **Step 6: Buat Halaman Pengaturan Toko & Printer Struk (`/pengaturan`)**
  - Form Nama Toko, Alamat, No Telepon.
  - Pilihan Ukuran Kertas Thermal: 58mm vs 80mm.
  - Header Struk (misal: "Terima Kasih Atas Kunjungan Anda").
  - Footer Struk (misal: "Barang yang sudah dibeli tidak dapat ditukar").

- [ ] **Step 7: Verifikasi seluruh interaksi UI di browser lokal**
  Pastikan styling, responsiveness, modal, dan flow navigasi berjalan mulus.

- [ ] **Step 8: Commit UI Web Dashboard**
  `git add src/app src/components && git commit -m "feat(web): build full KasirKu back office dashboard UI matching mockup"`

---

### Task 6: Push ke GitHub `siput-bersenjata/SalKa` & Deploy ke Vercel

**Files:**
- Create: `vercel.json` (jika diperlukan untuk build override atau headers)
- Modify: `package.json` (pastikan script `build: "prisma generate && next build"` siap)
- Create: `README.md` (dokumentasi lengkap, arsitektur, panduan env, dan dokumentasi REST API untuk Flutter)

- [ ] **Step 1: Siapkan script build untuk Vercel di `package.json`**
  Pastikan `postinstall` atau `build` menjalankan `prisma generate && next build` sehingga Prisma Client selalu di-generate saat build Vercel.

- [ ] **Step 2: Inisialisasi Git dan Hubungkan Remote GitHub**
  `git remote add origin https://github.com/siput-bersenjata/SalKa.git`
  `git branch -M main`

- [ ] **Step 3: Push seluruh codebase ke GitHub**
  `git push -u origin main --force`

- [ ] **Step 4: Deploy ke Vercel dengan Vercel CLI**
  Jalankan `vercel --prod` atau tautkan project Vercel bernama `salka` di team `salshya`.
  Konfigurasikan environment variable yang dibutuhkan (seperti `DATABASE_URL` dan `JWT_SECRET`).

- [ ] **Step 5: Verifikasi URL Vercel Live**
  Akses URL live di browser, pastikan halaman dashboard, login, dan REST API berfungsi sempurna.
