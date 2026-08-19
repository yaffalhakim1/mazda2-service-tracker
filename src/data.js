// ---- Katalog servis: interval berbasis km + bulan ----
// Interval dari pengalaman owner 310rb km (non-SkyActiv), bukan jadwal pabrik generik.
export const CATALOG = [
  { id: "oli", label: "Ganti oli mesin + filter oli", km: 5000, months: 6 },
  { id: "throttle", label: "Tune up / carbon cleaning / throttle body", km: 20000, months: null },
  { id: "filter", label: "Ganti filter udara", km: 15000, months: 12 },
  { id: "engineflush", label: "Engine flush", km: 20000, months: null },
  { id: "injector", label: "Injector cleaning", km: 35000, months: null },
  { id: "busi", label: "Ganti busi", km: 50000, months: null },
  { id: "filterac", label: "Ganti filter AC", km: 10000, months: 12 },
  { id: "tromol", label: "Setting + bersihkan tromol belakang", km: 15000, months: null },
  { id: "remfluid", label: "Kuras minyak rem", km: 40000, months: 24 },
  { id: "fuelfilter", label: "Ganti filter bensin / bersihkan fuel pump", km: 50000, months: null },
  { id: "radiator", label: "Kuras + servis radiator", km: 100000, months: null },
  { id: "coolant", label: "Kuras air radiator (coolant)", km: 35000, months: null },
  { id: "olimatic", label: "Ganti oli matic", km: 20000, months: 24 },
  { id: "filtermatic", label: "Ganti filter oli matic", km: 100000, months: null },
  { id: "aki", label: "Cek accu (aki)", km: null, months: 36 },
  { id: "ac", label: "Bersihkan evap AC", km: null, months: 12 },
  { id: "racksteer", label: "Cek rack steer / kaki-kaki", km: 20000, months: 12 },
  { id: "spooring", label: "Spooring & balancing", km: 10000, months: null },
  { id: "ban", label: "Ganti ban", km: 60000, months: 60 },
  { id: "wiper", label: "Ganti wiper", km: null, months: 6 },
  { id: "other", label: "Lainnya", km: null, months: null },
];

// ---- Data seed (dikelola lewat file ini, lalu push) ----
// Cara pakai:
//  1. Tambah/ubah entry di SEED_ENTRIES, beri `v` = SEED_VERSION baru.
//  2. Bump SEED_VERSION + SEED_CAR_KM (odometer terbaru).
// Aplikasi hanya menerapkan entry dengan `v` yang lebih baru dari
// yang sudah pernah dilihat user — edit/hapus manual user tidak akan
// ditimpa oleh seed lama.
export const SEED_VERSION = 15;
export const SEED_ENTRIES = [
  { v: 1, id: "seed-oli-0719", type: "oli", date: "2026-07-19", km: 82206, cost: 407000, notes: "Fastron Eco SAE 5W-30 + filter oli (Pertamina). Ganti oli berikutnya di km 87.206" },
  { v: 1, id: "seed-aki-0719", type: "aki", date: "2026-07-19", km: 82296, cost: 830000, notes: "Ganti aki" },
  { v: 2, id: "seed-rack-0725", type: "racksteer", date: "2026-07-25", km: 82296, cost: 1000000, notes: "Servis rack steer + kolom steer, Cahaya Per Bekasi, garansi 6bln" },
  { v: 3, id: "seed-spooring-0726", type: "spooring", date: "2026-07-26", km: 82296, cost: 150000, notes: "Spooring 3D, hasil semua dalam spec" },
  { v: 6, id: "seed-jointsteer", type: "other", date: "2026-07-19", km: 82296, cost: 730000, notes: "Joint steer 530rb + pasang 200rb (tgl perkiraan)" },
  { v: 6, id: "seed-jok", type: "other", date: "2026-07-19", km: 82296, cost: 600000, notes: "Retrim jok kulit (tgl perkiraan)" },
  { v: 15, id: "seed-ban", type: "ban", date: "2026-07-19", km: 82296, cost: 1400000, notes: "Ban depan 2pcs. Ganti berikutnya di km 142.296 atau 5 tahun (2031)." },
  { v: 6, id: "seed-samsat", type: "other", date: "2026-07-19", km: 82296, cost: 50000, notes: "Cek fisik tempel samsat (tgl perkiraan)" },
  { v: 11, id: "seed-consum-0805", type: "other", date: "2026-08-05", km: 83008, cost: 0, notes: "Catatan konsumsi BBM: AV 8.9 L/100km (~11.2 km/L). CUR fluktuasi 7.7-10 L/100km saat jalan (normal, tergantung kondisi)." },
  { v: 12, id: "seed-filter-0717", type: "filter", date: "2026-07-17", km: 82206, cost: 0, notes: "Ganti filter udara (km perkiraan ~82.2rb, biaya belum dicatat)" },
  { v: 13, id: "seed-filterac-0717", type: "filterac", date: "2026-07-17", km: 82206, cost: 0, notes: "Ganti filter AC (km perkiraan ~82.2rb, biaya belum dicatat)" },
];
export const SEED_CAR_KM = 83049;