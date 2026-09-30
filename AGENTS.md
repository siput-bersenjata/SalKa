# ATURAN WAJIB & PROTOKOL KEAMANAN DATA (DATABASE & DEPLOY)
> **PENTING / CRITICAL**: Setiap AI assistant, developer, atau proses otomatis yang menjalankan tugas di repositori ini **WAJIB MEMBACA DAN MEMATUHI CATATAN INI TERLEBIH DAHULU SEBELUM MELAKUKAN EKSEKUSI APAPUN**.

---

## 🚨 1. LARANGAN KERAS PENGHAPUSAN ATAU RESET DATA DATABASE
1. **DILARANG KERAS** menjalankan perintah yang dapat mereset, menghapus, atau mengosongkan data yang sudah ada di database, seperti:
   - `prisma migrate reset`
   - `prisma db push --force-reset`
   - `prisma db push --accept-data-loss` (tanpa izin eksplisit)
   - Perintah SQL `DROP TABLE`, `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`, atau `DELETE FROM` tanpa filter spesifik dan persetujuan user.
2. **Kecuali Ada Izin Eksplisit**: Jangan pernah menghapus data user, akun karyawan, produk, kategori, atau transaksi kecuali user/owner secara eksplisit memerintahkan: *"Ya, hapus data X"* atau *"Silakan reset database"*.
3. **Jika Ragu, Wajib Berhenti dan Bertanya**: Jauh lebih baik menanyakan konfirmasi kepada user daripada menyebabkan data penting toko/kasir hilang.

---

## 🛡️ 2. PRINSIP MIGRASI & DEPLOY (ADDITIVE CHANGES ONLY)
1. **Migrasi Selalu Bersifat Menambah (Additive)**:
   - Menambah kolom baru dengan nilai default atau nullable (`@default(...)` atau `?`).
   - Menambah tabel baru atau enum nilai baru.
   - Jangan pernah menghapus kolom atau tabel yang sedang aktif menyimpan data produksi.
2. **Jaminan Kelestarian Data (Data Persistence)**:
   - Data akun pengguna (`User`), toko (`Store`), produk (`Product`), kategori (`Category`), dan transaksi kasir (`Transaction`) milik user WAJIB selalu utuh saat deploy.
3. **Penyediaan Starter Data Multi-Tenant**:
   - Setiap kali user mendaftar akun toko baru, sistem wajib menyertakan kategori dan produk starter (seperti Air Mineral, Teh Botol, Indomie, dll.) agar katalog toko tidak kosong dan siap langsung digunakan untuk transaksi kasir.

---

## 📦 3. PROTOKOL DEPLOYMENT VERCEL & DATABASE NEON
1. **Database Produksi**:
   - PostgreSQL di Neon Tech dengan skema khusus `schema=salka`.
   - Pastikan URL database selalu menyertakan `?sslmode=require&schema=salka`.
2. **Perintah Build Aman**:
   - `prisma generate && next build`
   - Tidak menyertakan perintah destructive reset di build pipeline.
3. **Verifikasi Pasca Deploy**:
   - Selalu lakukan pengecekan data setelah deploy untuk memastikan akun dan produk user tetap ada dan utuh.
