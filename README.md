# Sentrarsip (Sistem Kearsipan & Workflow Digital)

Sentrarsip (sebelumnya E-Arsip NextGen) adalah sistem informasi manajemen kearsipan dan persuratan digital berbasis web. Sistem ini dilengkapi dengan fitur *workflow* berjenjang, tanda tangan digital otomatis menggunakan QR Code, serta pengarsipan otomatis.

## 🚀 Fitur Utama

- **Manajemen Persuratan:** Pembuatan surat masuk dan keluar dengan *template* dan *rich text editor*.
- **Workflow Pipeline Digital berjenjang:** 
  - **Maker:** Pembuat surat (Drafting).
  - **Checker:** Pemeriksa surat berjenjang (bisa banyak checker). Bisa "Setujui" atau "Minta Revisi".
  - **Approver:** Penandatangan surat. Bisa "Setujui" (Tanda Tangan Digital) atau "Minta Revisi".
  - **Publisher (Opsional):** Menerbitkan dan mendistribusikan surat kepada penerima.
- **Siklus Revisi Cerdas:** Jika surat ditolak (Minta Revisi), surat akan dikembalikan ke Maker, dan *pipeline workflow* akan di-reset untuk mengulang putaran (siklus) persetujuan baru. *Log* aktivitas tetap tersimpan secara historis.
- **Auto-Publish (Tanpa Publisher):** Jika surat tidak memiliki publisher, setelah semua approver tanda tangan, surat akan otomatis berstatus *Published*.
- **Tanda Tangan Elektronik & QR Code Verifikasi:** QR Code otomatis di-generate ketika surat ditandatangani oleh *Approver*, dan disematkan langsung pada *body* surat.
- **Pengarsipan Otomatis (Auto-Archive):** Saat surat diterbitkan (*Published*), surat dan metadatanya (Tingkat Keamanan, Sifat/Urgensi, Klasifikasi) akan otomatis masuk ke dalam sistem Arsip digital.
- **Notifikasi Terintegrasi:** Notifikasi otomatis ke setiap *User* (Checker, Approver, Publisher, Pembuat, Penerima).
- **Manajemen Organisasi & Posisi:** Pengaturan Unit Kerja, Jabatan, dan Hak Akses per *User*.

## 🛠️ Teknologi yang Digunakan

### Backend
- **Bahasa:** Go (Golang)
- **Framework:** Gin Web Framework
- **ORM:** GORM
- **Database:** MySQL / MariaDB
- **Fitur Tambahan:** JWT Authentication, Go-QRCode.

### Frontend
- **Library:** React 18
- **Bahasa:** TypeScript
- **Tooling:** Vite
- **Routing:** React Router DOM
- **UI/Icons:** Lucide React, CSS Vanilla (Responsif).

## 📋 Prasyarat Sistem

Pastikan Anda telah menginstal 🔧:
- [Go](https://go.dev/dl/) v1.20+
- [Node.js](https://nodejs.org/) v18+ & NPM
- MySQL atau MariaDB (direkomendasikan menggunakan XAMPP, Laragon, FlyEnv, atau semacamnya).

## ⚙️ Cara Menjalankan Aplikasi

### 1. Konfigurasi Database
Buat database baru di MySQL dengan nama `earsip_db` (atau nama lain sesuai preferensi Anda).

### 2. Jalankan Backend (Go)
1. Buka terminal, masuk ke folder `backend`:
   ```bash
   cd backend
   ```
2. Salin dan sesuaikan file `.env` (Jika belum ada, buat `.env` berdasarkan konfigurasi sistem Anda):
   ```env
   DB_USER=root
   DB_PASSWORD=
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=earsip_db
   PORT=8080
   JWT_SECRET=supersecretkey_earsip_2024
   UPLOAD_DIR=./uploads
   ```
3. Unduh *dependencies*:
   ```bash
   go mod download
   ```
4. Jalankan *server* (Akan otomatis melakukan migrasi database dan melakukan *seeding* data awal):
   ```bash
   go run cmd/server/main.go
   ```

### 3. Jalankan Frontend (React + Vite)
1. Buka tab terminal baru, masuk ke folder `frontend`:
   ```bash
   cd frontend
   ```
2. Instal *dependencies*:
   ```bash
   npm install
   ```
3. Jalankan *development server*:
   ```bash
   npm run dev
   ```
4. Buka browser dan akses URL (biasanya `http://localhost:5173`).

## 🔑 Akun Demo (Default Seeder)

Berikut adalah akun yang dibuat otomatis saat pertama kali aplikasi dijalankan:
- **Superadmin:** `admin` | Password: `admin` (atau `admin123`)
- **Admin Operasional:** `admin_op` | Password: `password`
- **Pegawai 1:** `pegawai1` | Password: `password`
- **Pegawai 2:** `pegawai2` | Password: `password`
- **Pegawai 3:** `pegawai3` | Password: `password`

*(Pastikan untuk mengubah password pada *environment* produksi)*.

## 📝 Struktur Folder
- `/backend`: Berisi *source code* backend Go.
  - `/cmd/server/main.go`: Entry point backend.
  - `/internal/handlers`: Controller untuk API (surat, arsip, user, dll).
  - `/internal/models`: Definisi skema database.
  - `/internal/services`: *Business logic*, helper, dan notifikasi.
- `/frontend`: Berisi *source code* aplikasi React SPA.
  - `/src/pages`: Halaman-halaman antarmuka pengguna *(Letters, Archive, Inbox, dll)*.
  - `/src/components`: Komponen modular (Sidebar, Header, dsb).
  - `/src/types`: Definisi *Typescript Interfaces*.
