# Kartu Servis — Mazda2 RZ 2013

Tracker perawatan mobil pribadi: interval servis berbasis km + bulan, riwayat servis, dan total pengeluaran. Data tersimpan di `localStorage` browser (via shim `window.storage`).

## Development

```bash
npm install
npm run dev     # dev server
npm run build   # build ke dist/
```

## Deploy

Push ke `main` → GitHub Actions build & deploy otomatis ke GitHub Pages:
https://yaffalhakim1.github.io/mazda2-service-tracker/

## Data seed

Entry data baru ditambahkan di `SEED_ENTRIES` pada `src/data.js`. Setiap kali mengubah/menambah entry:

1. Beri entry `v` = `SEED_VERSION` yang baru (untuk entry baru).
2. Bump `SEED_VERSION` dan `SEED_CAR_KM` (odometer terbaru).

Aplikasi hanya menerapkan entry dengan `v` lebih baru dari yang pernah dilihat user - edit/hapus manual user tidak akan ditimpa seed lama.