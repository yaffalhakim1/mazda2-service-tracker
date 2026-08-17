const pad = (x) => String(x).padStart(2, "0");

// Tanggal lokal (bukan UTC): mencegah off-by-one di WIB saat 00:00-06:59.
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const fmtIDR = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

export const monthsBetween = (a, b) => {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
};

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** True hanya jika km valid (angka finite > 0) — menolak NaN dari format "45.000". */
export const isValidKm = (v) => Number.isFinite(Number(v)) && Number(v) > 0;