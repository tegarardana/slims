# Panduan Menyalakan & Mematikan Project SLIMS

Project ini dibangun menggunakan **Next.js**, **Prisma ORM**, dan **PostgreSQL**. Berikut adalah langkah-langkah untuk menyalakan dan mematikannya pada perangkat lokal Anda.

---

## 📋 Prasyarat (Prerequisites)
Sebelum memulai, pastikan Anda telah menginstal:
1. **Node.js** (rekomendasi versi LTS terbaru)
2. **PostgreSQL** yang berjalan secara lokal pada port `5432` dengan database bernama `slims` (atau sesuai konfigurasi di file `.env`).

---

## 🚀 Cara Menyalakan Project

Ikuti urutan langkah berikut di Terminal / Command Prompt Anda:

### Langkah 1: Pastikan PostgreSQL Berjalan
Sebelum menyalakan server aplikasi, pastikan database server Anda sudah menyala.
* **Mac (Homebrew):**
  ```bash
  brew services start postgresql
  ```
* **Verifikasi koneksi:**
  ```bash
  pg_isready
  ```

### Langkah 2: Sinkronisasi & Migrasi Database (Hanya jika ada perubahan skema / database baru)
Jika Anda baru pertama kali menjalankan project, atau ada perubahan pada file `prisma/schema.prisma`:
```bash
# Sinkronkan skema prisma dengan database
npx prisma db push
```

### Langkah 3: Seed Data Awal (Opsional)
Jika database Anda masih kosong atau Anda membutuhkan akun-akun uji coba bawaan (admin, guru, siswa):
```bash
npx tsx prisma/seed.ts
```

### Langkah 4: Jalankan Server Development
Jalankan perintah berikut di root folder project untuk menyalakan server aplikasi:
```bash
npm run dev
```
Setelah server berjalan, Anda dapat mengakses aplikasi melalui browser pada alamat:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛑 Cara Mematikan Project

### Langkah 1: Matikan Server Development (Aplikasi)
Pada terminal tempat Anda menjalankan `npm run dev`, tekan tombol:
```
Ctrl + C
```
Ini akan menghentikan proses Next.js development server secara instan.

### Langkah 2: Matikan PostgreSQL (Opsional)
Jika Anda ingin mematikan database server untuk menghemat resource sistem:
* **Mac (Homebrew):**
  ```bash
  brew services stop postgresql
  ```

---

## 🛠️ Perintah Tambahan yang Berguna

### 1. Membuka Prisma Studio (GUI Database Viewer)
Untuk melihat, mengedit, atau menghapus data langsung di database melalui tampilan web:
```bash
npx prisma studio
```
Akses di browser pada alamat: **[http://localhost:5555](http://localhost:5555)**

### 2. Melakukan Linting
Untuk memeriksa kualitas penulisan kode sesuai standar:
```bash
npm run lint
```
