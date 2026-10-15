# Kebijakan Keamanan

Nexa Academic adalah aplikasi web statis yang di-deploy melalui Vercel. Fitur akun dan sinkronisasi menggunakan Firebase Authentication dan Cloud Firestore. Kebijakan ini ditujukan untuk pengguna dan kontributor praktikum pada repositori ini.

## Versi yang didukung

Tidak ada rilis versi bertag yang tercantum. Gunakan versi terbaru pada branch `main` untuk memperoleh perubahan terkini. Salinan lama dan fork mungkin tidak menerima pembaruan.

## Menjaga kredensial dan data

- Jangan commit token, kata sandi, private key, service account, atau data pribadi ke repositori.
- Konfigurasi Firebase yang dipakai di frontend dapat terlihat oleh pengguna browser. Perlakukan konfigurasi klien sebagai informasi publik; jangan menaruh kredensial admin atau rahasia server di sana.
- Batasi API key Firebase sesuai kebutuhan proyek dan domain deployment. API key klien bukan kontrol akses untuk data.
- Akses Firestore harus dibatasi oleh Security Rules di sisi Firebase. Jangan mengandalkan validasi tampilan atau JavaScript klien sebagai perlindungan data. Periksa aturan Firebase sebelum menggunakan data nyata.
- File hasil ekspor JSON dapat memuat data belajar atau informasi pribadi. Simpan file itu secara privat dan jangan unggah ke repo publik.

## Melaporkan masalah keamanan

Jangan membuka issue atau pull request publik berisi langkah eksploitasi, data pengguna, atau kredensial.

Gunakan **Private vulnerability reporting** pada tab **Security** repositori jika fitur tersebut tersedia. Jika tidak tersedia, hubungi pemilik repositori melalui profil GitHub [@xyzw168](https://github.com/xyzw168) untuk meminta cara komunikasi privat. Sampaikan ringkasan dampak dan versi/commit terdampak; kirim detail teknis hanya melalui kanal privat yang disepakati. Jangan menyertakan kredensial atau data pribadi nyata.

Laporan sebaiknya menjelaskan langkah reproduksi yang aman, dampak, dan bukti minimum. Beri pengelola waktu yang wajar untuk memeriksa dan memperbaiki masalah sebelum detail dipublikasikan.

## Cakupan

Kebijakan ini mencakup kode pada repositori Nexa Academic. Untuk masalah pada Firebase atau Vercel sebagai layanan, gunakan kanal pelaporan resmi penyedia layanan tersebut.
