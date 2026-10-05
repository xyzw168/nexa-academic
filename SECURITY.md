# 🛡️ Kebijakan Keamanan (Security Policy) — Nexa Academic Hub

## 📌 Versi yang Didukung

Aplikasi web **Nexa** dikembangkan sebagai tugas praktikum akademik dan saat ini didukung pada versi produksi utama:

| Versi | Status Dukungan |
| :--- | :--- |
| `1.0.x` (Main Branch) | ✅ Didukung (Aktif) |
| `< 1.0.0` | ❌ Tidak Didukung |

---

## 🔒 Perlindungan API Key & Data Pengguna

1. **Firebase Client API Key:**
   API Key Firebase yang ada di dalam `index.html` merupakan kunci publik khusus *client-side* yang sudah dibatasi penggunaannya (*Domain Restriction / HTTP Referrers*) hanya untuk domain produksi Vercel (`*.vercel.app`) dan `localhost`.

2. **Keamanan Cloud Firestore:**
   Akses membaca dan menulis data pengguna diatur menggunakan aturan autentikasi berbasis pengguna (*User Authentication Rules*).

---

## 📩 Pelaporan Celah Keamanan (Reporting a Vulnerability)

Jika Anda menemukan celah keamanan (*bug* atau *vulnerability*) pada aplikasi ini, silakan laporkan melalui:

* **Pengembang:** Widiya Astuti
* **Email:** widiyaastuti168z@gmail.com
* **Repository:** [github.com/xyzw168/nexa-academic](https://github.com/xyzw168/nexa-academic)

Laporan akan ditinjau dalam waktu maksimal 1x24 jam.
