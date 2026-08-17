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

Entry data baru ditambahkan di `SEED_ENTRIES` pada `src/App.jsx`. Setiap kali mengubah/menambah entry, **bump `SEED_VERSION`** — aplikasi hanya menerapkan yang baru sejak load terakhir user.