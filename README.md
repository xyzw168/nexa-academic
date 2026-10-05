# ⚡ Nexa — Super Academic & Focus Hub

> Platform dashboard produktivitas akademik terpadu berbasis **Liquid Glass UI**. Dirancang khusus untuk mahasiswa dalam mengelola tugas kuliah, melatih fokus dengan teknik Pomodoro dan synthesizer suara latar, membangun kebiasaan belajar, mengelola anggaran harian, serta menyinkronkan data antar-perangkat secara otomatis.

---

## 📌 Permasalahan & Solusi

* **Masalah:** Mahasiswa sering kali kewalahan mengelola tugas kuliah dari banyak mata kuliah, kehilangan fokus saat belajar, tidak konsisten membangun kebiasaan harian, serta risau akan batas aman pengeluaran harian hingga akhir bulan.
* **Solusi:** **Nexa** hadir sebagai *Super Academic Hub* yang menggabungkan *Task Matrix* (Eisenhower), *Focus Station* (Pomodoro + Suara Alam), *Habit Tracker*, *Flashcards 3D*, *Daily Safe-Spend Calculator*, serta *Cloud Database Sync* berbasis Firebase.

---

## ✨ Fitur-Fitur Utama

1. **📋 Eisenhower Task Matrix:**
   - Pembagian status tugas (*To-Do*, *In Progress*, *Done*).
   - Filter prioritas (*High*, *Medium*, *Low*) dan Filter Mata Kuliah.
   - Manajemen subtasks (*anak tugas*) interaktif.

2. **⏱️ Focus Station & Ambient Sound Synthesizer:**
   - Timer Pomodoro 25m / 5m / 15m dengan tampilan *Circular Progress Ring SVG*.
   - **Synthesizer Suara Latar (Web Audio API):** Efek suara Deru Hujan (*Rain*) dan Gelombang Otak Alpha (*10Hz Binaural Beats*) murni yang dihasilkan oleh algoritma browser tanpa file audio eksternal.

3. **🔥 Habit & Study Streak Tracker:**
   - Pencatat kebiasaan harian otomatis lengkap dengan sistem hitung hari beruntun (*Streak Count*).

4. **🧠 Smart Flashcards 3D:**
   - Kartu rangkuman materi dengan efek balik 3D (*3D Flip Animation*) dan evaluasi tingkat kemudahan daya ingat.

5. **💰 Daily Safe-Spend Calculator:**
   - Kalkulator finansial harian mahasiswa untuk menghitung batas aman belanja per hari agar alokasi tabungan dan saldo akhir bulan tetap terjaga.

6. **📊 Analytics & Productivity Score:**
   - Menghitung Skor Produktivitas harian (0–100 PTS) serta grafik batang penyelesaian tugas menggunakan *HTML5 Canvas*.

7. **🔐 Firebase Auth, Cloud Sync & Backup JSON:**
   - **Firebase Authentication & Firestore:** Fitur Login/Daftar Akun dan Edit Profil untuk sinkronisasi data lintas perangkat secara otomatis di cloud.
   - **Local Backup (JSON Exporter/Importer):** Ekspor dan impor data lokal secara offline tanpa wajib login.

---

## 🛠️ Teknologi yang Digunakan

* **HTML5 & CSS3:** Tailwind CSS, Glassmorphism Backdrop Filter, Font Awesome 6, & Flexbox/Grid Layout.
* **JavaScript (Vanilla JS & Web Audio API):** Manipulasi DOM, kalkulasi timer, generator frekuensi suara alam, serta visualisasi grafik *HTML5 Canvas*.
* **Firebase (v10 SDK Module):** Firebase Authentication & Cloud Firestore Database.
* **Hosting / Deployment:** Vercel Continuous Deployment.

---

## 🚀 Cara Menjalankan Proyek secara Lokal

1. **Clone Repository ini:**
   ```bash
   git clone [https://github.com/xyzw168/nexa-academic.git](https://github.com/xyzw168/nexa-academic.git)

---
