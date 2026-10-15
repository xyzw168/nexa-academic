# Nexa Academic

Nexa Academic adalah aplikasi web statis untuk membantu mahasiswa mengatur kegiatan belajar dalam satu dashboard. Aplikasi menyediakan pengelolaan tugas, timer fokus, pencatatan kebiasaan, flashcard, kalkulator anggaran harian, dan ringkasan produktivitas.

**Demo:** https://nexa-academic.vercel.app

## Fitur

- **Task Matrix:** status tugas, prioritas, filter mata kuliah, dan subtugas.
- **Focus Station:** timer Pomodoro dan suara latar yang dibuat menggunakan Web Audio API.
- **Habit Tracker:** pencatatan kebiasaan dan rangkaian hari belajar.
- **Flashcards:** kartu belajar dengan animasi balik dan penilaian ingatan.
- **Daily Safe-Spend:** kalkulasi batas belanja harian.
- **Analytics:** skor produktivitas dan grafik penyelesaian tugas.
- **Akun dan sinkronisasi:** Firebase Authentication dan Cloud Firestore.
- **Cadangan data:** ekspor/impor JSON untuk cadangan lokal.

## Teknologi

HTML, CSS, JavaScript vanilla, Web Audio API, Canvas, Firebase Authentication, Cloud Firestore, dan service worker. Proyek ini menyajikan `index.html` dari folder utama repositori dan tidak memerlukan langkah build khusus.

## Menjalankan di komputer lokal

```bash
git clone https://github.com/xyzw168/nexa-academic.git
cd nexa-academic
python -m http.server 8000
```

Buka `http://localhost:8000` di browser. Jika Python tidak tersedia, gunakan ekstensi server lokal di VS Code. Fitur yang memakai Firebase mungkin memerlukan konfigurasi dan domain yang diizinkan pada proyek Firebase.

## Deploy ke Vercel

1. Impor repositori ini di Vercel menggunakan akun GitHub.
2. Biarkan Vercel mendeteksi pengaturan proyek. Aplikasi adalah situs statis dengan `index.html` di folder utama.
3. Setelah deployment berstatus **Ready**, buka URL `.vercel.app` dan pastikan aplikasi tampil dengan benar.
4. Deployment berikutnya berjalan otomatis setelah perubahan di branch yang terhubung di-push ke GitHub.

## Alur perubahan

```bash
git add .
git commit -m "deskripsi singkat perubahan"
git push
```

Pastikan perubahan sudah muncul di GitHub dan deployment Vercel berstatus **Ready**. Jangan memasukkan API key rahasia, token, kata sandi, atau data pribadi ke commit. Baca [SECURITY.md](SECURITY.md) sebelum melaporkan masalah keamanan.
