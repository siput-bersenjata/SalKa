# SalKa (KasirKu) - Modern POS & Back Office Ecosystem

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat&logo=prisma)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat&logo=postgresql)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)](https://vercel.com/)

Aplikasi sistem kasir (Point of Sale) terpadu dengan Web Dashboard Monitoring untuk pemilik toko dan Super Admin, dilengkapi sistem **Trial Otomatis 1 Bulan**, manajemen lisensi batas waktu, pengelolaan stok barang, serta kesiapan integrasi penuh ke **Aplikasi Android Kasir (Flutter)** dengan printer thermal Bluetooth (58mm/80mm).

---

## 🌟 Fitur Utama

### 1. Web Dashboard Monitoring (Back Office)
- **Ringkasan Aktivitas Toko**: Kartu metrik Total Transaksi, Total Pendapatan, Total Item Terjual, dan Indikator Stok Menipis.
- **Grafik Penjualan Harian**: Visualisasi tren omset 7 hari dan 30 hari terakhir.
- **Diagram Penjualan per Kategori**: Donut chart distribusi omset menu (Minuman, Makanan, Snack, dll).
- **Peringatan Stok Menipis**: Deteksi otomatis produk yang stoknya mencapai batas minimum (`minStock`) dengan badge sisa stok.
- **Transaksi Real-Time**: Daftar riwayat pembayaran dengan metode Tunai, QRIS, dan Debit/Kredit.

### 2. Super Admin & Lisensi Masa Aktif
- **Otomatis Trial 30 Hari**: Setiap akun kasir baru yang mendaftar via aplikasi Android langsung mendapatkan masa percobaan gratis 30 hari.
- **Penyetelan Batas Waktu oleh Admin**:
  - Super Admin dapat mengubah atau memperpanjang masa aktif akun kasir mana pun (+1 Bulan, +3 Bulan, +6 Bulan, +1 Tahun, atau **Aktif Selamanya / Lifetime**).
  - Pilihan penyetelan tanggal kedaluwarsa kustom dengan kalender.
- **Aturan Kadaluwarsa Ramah UMKM**: Jika masa aktif habis, akun kasir tetap dapat login dan melihat riwayat data/laporan lama, tetapi diblokir dari membuat transaksi baru dan menambah produk sampai lisensi diperpanjang.
- **Monitoring Seluruh Toko**: Super Admin dapat melihat seluruh data transaksi dan inventaris stok setiap toko yang terdaftar.

### 3. Pengaturan Toko & Printer Struk Termal (Bluetooth ESC/POS)
- Pengaturan nama toko, alamat, dan nomor WhatsApp.
- Pilihan ukuran kertas thermal: **58mm** (mini bluetooth portable) vs **80mm** (desktop POS).
- Kustomisasi teks **Header** dan **Footer Struk** belanja.
- Pratinjau langsung cetak struk belanja thermal di web & browser print simulation.

---

## 🚀 Kredensial Akun Default

Database telah diisi dengan data awal (*seeded*):

| Role | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `admin123` | Akses penuh dashboard, monitoring semua toko & atur masa aktif |
| **Kasir Demo** | `kasir1` | `kasir123` | Toko Sumber Rejeki (Trial Aktif 30 Hari) |

---

## 📡 Dokumentasi REST API (Untuk Aplikasi Android Flutter)

Base URL: `https://salka.vercel.app/api` (atau `http://localhost:3000/api` saat dev lokal)

Semua endpoint yang membutuhkan autentikasi menerima header:
```http
Authorization: Bearer <TOKEN_JWT>
```

### 1. Autentikasi & Akun
- **POST** `/api/auth/register`: Mendaftar akun kasir baru (otomatis mendapatkan trial 30 hari).
  - *Body*: `{"username": "tokojaya", "password": "password123", "storeName": "Toko Jaya", "fullName": "Jaya", "phone": "08123456789"}`
- **POST** `/api/auth/login`: Login username & password.
  - *Returns*: `{ token, user, store, trial: { status, isExpired, daysRemaining, expiresAt, isLifetime } }`
- **GET** `/api/auth/me`: Cek status user dan sisa masa aktif saat ini.

### 2. Produk & Kategori
- **GET** `/api/categories`: Ambil daftar kategori produk toko.
- **GET** `/api/products`: Ambil daftar produk (parameter: `?categoryId=...&search=...&lowStock=true`).
- **POST** `/api/products`: Tambah produk baru (otomatis dicek masa aktif, jika expired mengembalikan `403 Forbidden`).
- **PUT** `/api/products/[id]`: Ubah harga, nama, kategori, atau stok produk.
- **DELETE** `/api/products/[id]`: Hapus produk.

### 3. Transaksi & Kasir
- **POST** `/api/transactions`: Checkout pembayaran belanja.
  - *Body*:
    ```json
    {
      "paymentMethod": "CASH",
      "paidAmount": 50000,
      "items": [
        { "productId": "prod_1", "quantity": 2 }
      ],
      "customerName": "Pelanggan 1",
      "notes": "Meja 3"
    }
    ```
  - *Efek*: Otomatis mengurangi stok produk secara atomik dan menghasilkan nomor faktur unik (`TRX20260930XXXXX`). Jika trial habis, transaksi ditolak dengan pesan peringatan.
- **GET** `/api/transactions`: Ambil riwayat transaksi (parameter: `?startDate=...&endDate=...&page=1&limit=50`).

### 4. Pengaturan Struk Toko
- **GET** `/api/store/profile`: Mengambil nama toko, alamat, ukuran kertas (58mm/80mm), header/footer struk.
- **PUT** `/api/store/profile`: Mengubah pengaturan toko dan format struk thermal.

### 5. Super Admin
- **GET** `/api/admin/users`: Daftar seluruh akun kasir beserta sisa hari dan statusnya.
- **POST** `/api/admin/users/[id]/extend`: Setel batas waktu / perpanjang masa aktif akun:
  - *Body*: `{"extensionType": "1_MONTH" | "3_MONTHS" | "6_MONTHS" | "1_YEAR" | "LIFETIME" | "CUSTOM", "customDate": "2027-12-31"}`
- **GET** `/api/admin/transactions`: Rekap transaksi global seluruh toko.

---

## 🛠️ Instalasi & Menjalankan Lokal

```bash
# 1. Clone repository
git clone https://github.com/siput-bersenjata/SalKa.git
cd SalKa

# 2. Instal dependencies
npm install

# 3. Setup environment (.env)
cp .env.example .env

# 4. Sinkronisasi database Prisma
npx prisma db push

# 5. Jalankan seed data awal
npm run seed

# 6. Jalankan server dev lokal
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## ☁️ Deployment ke Vercel

Aplikasi ini 100% kompatibel dengan serverless runtime Vercel dan cloud PostgreSQL (Neon / Vercel Postgres / Supabase).

1. Hubungkan repository GitHub `siput-bersenjata/SalKa` ke project Vercel.
2. Tambahkan Environment Variable di Vercel Settings:
   - `DATABASE_URL`: Connection string PostgreSQL
   - `DIRECT_URL`: Connection string unpooled PostgreSQL
   - `JWT_SECRET`: Kunci rahasia token JWT
3. Build command: `prisma generate && next build` (sudah terkonfigurasi di `package.json`).
