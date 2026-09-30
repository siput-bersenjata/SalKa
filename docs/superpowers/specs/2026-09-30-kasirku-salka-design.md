# Spesifikasi Desain Sistem: KasirKu (SalKa POS & Back Office)

**Tanggal:** 30 September 2026  
**Status:** Disetujui untuk Implementasi  
**Repositori GitHub:** [siput-bersenjata/SalKa](https://github.com/siput-bersenjata/SalKa.git)  
**Target Deployment Vercel:** Project `salka` (`https://salka.vercel.app` atau `https://salka-*.vercel.app`)

---

## 1. Ringkasan Eksekutif

**KasirKu (SalKa)** adalah ekosistem aplikasi kasir (Point of Sale) modern dan cloud-ready yang dirancang untuk UMKM dan pemilik bisnis multi-cabang/multi-tenant. Sistem ini terdiri dari dua pilar utama:
1. **Sub-proyek 1: Web Dashboard Back Office & REST API Backend** (Next.js 14 App Router, TypeScript, Prisma ORM, PostgreSQL/Neon Serverless untuk Vercel).
2. **Sub-proyek 2: Aplikasi Mobile Kasir Android** (Flutter, Bluetooth Thermal ESC/POS 58mm/80mm, Cetak Struk, Manajemen Menu & Transaksi Cepat).

---

## 2. Arsitektur & Lingkungan Deployment

### 2.1 Arsitektur Serverless & Vercel
- **Framework**: Next.js 14+ (App Router) dengan Tailwind CSS & Lucide Icons.
- **ORM**: Prisma Client.
- **Database**: PostgreSQL (Kompatibel dengan Vercel Postgres / Neon Serverless Postgres).
- **Autentikasi**: JWT (JSON Web Token) dengan hashing password aman (bcryptjs).
- **CORS**: Dikonfigurasi agar aman diakses oleh aplikasi Android Flutter maupun Web Browser.

### 2.2 Hirarki Role & Hak Akses
1. **SUPER_ADMIN (Admin Web)**:
   - Akses penuh ke seluruh data toko yang terdaftar di platform.
   - Mengatur durasi masa aktif / batas waktu trial akun kasir (misal: tambah 1 bulan, 3 bulan, 1 tahun, atau aktif selamanya).
   - Melihat monitoring transaksi global, rekap omset seluruh toko, dan stok menipis.
2. **STORE_OWNER / KASIR**:
   - Mendaftar via aplikasi Android atau Web.
   - Otomatis mendapatkan status **TRIAL aktif selama 30 hari**.
   - Mengelola produk, kategori, stok, dan kasir toko sendiri.
   - Menghubungkan printer Bluetooth thermal, mengubah ukuran kertas (58mm/80mm), mengedit nama toko, alamat, dan header/footer struk.
   - **Aturan Kadaluwarsa**: Jika masa aktif habis, akun tetap bisa login dan melihat rekap transaksi lama, namun tidak dapat membuat transaksi baru atau menambah produk (muncul pesan: *"Masa aktif akun Anda telah berakhir. Silakan hubungi Admin untuk perpanjangan."*).

---

## 3. Skema Basis Data (Database Schema)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPER_ADMIN
  STORE_OWNER
  CASHIER
}

enum AccountStatus {
  TRIAL
  ACTIVE
  EXPIRED
  SUSPENDED
}

enum PaymentMethod {
  CASH
  QRIS
  DEBIT_CREDIT
}

model User {
  id                String         @id @default(cuid())
  username          String         @unique
  passwordHash      String
  fullName          String?
  phone             String?
  role              Role           @default(STORE_OWNER)
  accountStatus     AccountStatus  @default(TRIAL)
  trialExpiresAt    DateTime       // Ditetapkan +30 hari saat registrasi
  subscriptionUntil DateTime?      // Tanggal akhir perpanjangan oleh Super Admin
  notes             String?        // Catatan admin
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  stores            Store[]
}

model Store {
  id              String           @id @default(cuid())
  userId          String
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String           @default("Toko Sumber Rejeki")
  address         String?
  phone           String?
  receiptHeader   String?          @default("Terima Kasih Atas Kunjungan Anda")
  receiptFooter   String?          @default("Barang yang sudah dibeli tidak dapat ditukar/dikembalikan")
  paperSize       String           @default("58mm") // 58mm atau 80mm
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  categories      Category[]
  products        Product[]
  transactions    Transaction[]
}

model Category {
  id        String    @id @default(cuid())
  storeId   String
  store     Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  name      String    // Contoh: Makanan, Minuman, Snack, Lainnya
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  products  Product[]
}

model Product {
  id          String            @id @default(cuid())
  storeId     String
  store       Store             @relation(fields: [storeId], references: [id], onDelete: Cascade)
  categoryId  String?
  category    Category?         @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  name        String
  price       Float             // Harga Jual
  costPrice   Float?            @default(0) // Harga Pokok / Modal
  stock       Int               @default(0)
  minStock    Int               @default(5) // Ambang batas stok menipis
  imageUrl    String?
  barcode     String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  items       TransactionItem[]
}

model Transaction {
  id              String            @id @default(cuid())
  invoiceNumber   String            @unique // Misal: TRX20260930001
  storeId         String
  store           Store             @relation(fields: [storeId], references: [id], onDelete: Cascade)
  totalAmount     Float
  paidAmount      Float
  changeAmount    Float             @default(0)
  paymentMethod   PaymentMethod     @default(CASH)
  cashierName     String?
  customerName    String?
  notes           String?
  createdAt       DateTime          @default(now())

  items           TransactionItem[]
}

model TransactionItem {
  id            String      @id @default(cuid())
  transactionId String
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  productId     String?
  product       Product?    @relation(fields: [productId], references: [id], onDelete: SetNull)
  productName   String
  price         Float
  quantity      Int
  subtotal      Float
}
```

---

## 4. Rincian Fitur Web Dashboard (KasirKu Back Office)

Sesuai dengan mockup referensi:
1. **Kartu Metrik Utama**:
   - Total Transaksi (jumlah transaksi & tren persentase)
   - Total Pendapatan (Rp & tren persentase)
   - Total Item Terjual (pcs)
   - Stok Menipis (jumlah produk di bawah ambang `minStock`)
2. **Grafik & Visualisasi**:
   - Grafik Tren Penjualan 7 Hari / 30 Hari
   - Diagram Donat Pembagian Penjualan per Kategori (Minuman, Makanan, Snack, dll.)
3. **Panel Cepat**:
   - Peringatan Daftar Produk Stok Menipis (dengan badge sisa stok dan tombol restock)
   - Tabel Transaksi Terbaru (No. Transaksi, Tanggal & Waktu, Total, Metode, Status)
4. **Manajemen Akun & Lisensi (Super Admin View)**:
   - Daftar seluruh akun kasir yang terdaftar
   - Status akun (TRIAL / AKTIF / KADALUWARSA) & sisa hari
   - Form / Modal Penyetelan Batas Waktu: Tambah durasi (+1 Bulan, +3 Bulan, +6 Bulan, +1 Tahun, Custom Date, atau Tanpa Batas)
   - Filter transaksi dan stok per akun/toko
5. **Pengaturan Struk & Toko**:
   - Edit Nama Toko, Alamat, No Telepon
   - Ukuran kertas thermal (58mm / 80mm)
   - Header & Footer struk belanja

---

## 5. Rincian REST API Endpoint (Untuk Mobile & Web)

| Endpoint | Method | Keterangan | Autentikasi |
| :--- | :---: | :--- | :---: |
| `/api/auth/register` | POST | Mendaftar akun baru (otomatis masa trial 30 hari) | Publik |
| `/api/auth/login` | POST | Login username & password (mengembalikan JWT & info trial) | Publik |
| `/api/auth/me` | GET | Cek profil user saat ini, status trial, dan toko | User Token |
| `/api/admin/users` | GET | List seluruh akun kasir & status trialnya | Super Admin |
| `/api/admin/users/[id]/extend` | POST | Perpanjang masa aktif / ubah batas waktu akun | Super Admin |
| `/api/admin/transactions` | GET | Rekap semua transaksi seluruh toko | Super Admin |
| `/api/store/profile` | GET / PUT | Dapatkan & edit nama toko, alamat, struk & printer | User Token |
| `/api/products` | GET / POST | List produk & tambah produk (cek masa aktif) | User Token |
| `/api/products/[id]` | PUT / DELETE | Update produk, harga, & stok | User Token |
| `/api/transactions` | GET / POST | Riwayat transaksi & checkout baru (kurangi stok otomatis) | User Token |
| `/api/reports/summary` | GET | Ringkasan penjualan, metode pembayaran, & produk terlaris | User Token |

---

## 6. Kesiapan Sub-proyek 2: Aplikasi Android Flutter

- Aplikasi Flutter akan membaca konfigurasi REST API dari URL server Next.js Vercel (`https://salka.vercel.app` atau server lokal).
- Fitur Bluetooth Thermal Printer:
  - Menggunakan library ESC/POS thermal (`print_bluetooth_thermal`, `esc_pos_utils_plus`).
  - Scan perangkat Bluetooth di sekitar, simpan MAC address printer favorit.
  - Cetak struk dengan logo/nama toko, daftar barang, subtotal, metode pembayaran, kembalian, serta footer sesuai pengaturan kertas 58mm/80mm.
