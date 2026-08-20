import React, { useState, useEffect, useCallback } from "react";
import { Wrench, Plus, Gauge, Calendar, Banknote, Trash2, Stamp, Loader2, Download } from "lucide-react";
import { CATALOG, SEED_ENTRIES, SEED_VERSION, SEED_CAR_KM } from "./data.js";
import { todayStr, fmtIDR, fmtDate, monthsBetween, uid } from "./utils.js";

export default function App() {
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [car, setCar] = useState({ name: "Mazda2 RZ 2013", color: "Merah", km: 0 });
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState("due"); // due | add | history
  const [form, setForm] = useState({
    type: "oli",
    date: todayStr(),
    km: "",
    cost: "",
    notes: "",
  });
  const [error, setError] = useState("");

  // ---- load: terapkan hanya entry seed yang lebih baru dari load terakhir ----
  useEffect(() => {
    (async () => {
      let loadedCar = { name: "Mazda2 RZ 2013", color: "Merah", km: 0 };
      let loadedEntries = [];
      let lastVersion = 0;

      const read = async (key) => {
        try {
          const r = await window.storage.get(key);
          return r?.value ?? null;
        } catch {
          return null;
        }
      };
      const write = async (key, value) => {
        try {
          await window.storage.set(key, value);
        } catch {
          /* storage penuh / private mode — lewati */
        }
      };

      const savedCar = await read("car-info");
      if (savedCar) {
        try {
          loadedCar = JSON.parse(savedCar);
        } catch (e) {
          /* data korup — pakai default */
        }
      }
      const savedEntries = await read("service-entries");
      if (savedEntries) {
        try {
          loadedEntries = JSON.parse(savedEntries);
        } catch (e) {
          /* data korup — mulai kosong (seed akan mengisi) */
        }
      }
      const savedVersion = await read("seed-version");
      if (savedVersion) lastVersion = Number(savedVersion) || 0;

      // Hanya entry dengan v > lastVersion yang baru. Entry lama yang sudah
      // pernah diterapkan TIDAK disentuh lagi — edit/hapus user tetap aman.
      const freshSeeds = SEED_ENTRIES.filter((s) => s.v > lastVersion);
      if (freshSeeds.length > 0) {
        const seedById = new Map(freshSeeds.map((s) => [s.id, s]));
        const next = [
          ...loadedEntries.filter((e) => !seedById.has(e.id)),
          ...seedById.values(),
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        loadedEntries = next;
        await write("service-entries", JSON.stringify(next));
        await write("seed-version", String(SEED_VERSION));

        // Odometer: naikkan saja, jangan pernah reset ke bawah.
        if (loadedCar.km < SEED_CAR_KM) {
          loadedCar = { ...loadedCar, km: SEED_CAR_KM };
          await write("car-info", JSON.stringify(loadedCar));
        }
      }

      setCar(loadedCar);
      setEntries(loadedEntries);
      setReady(true);
    })();
  }, []);

  const persistCar = useCallback(async (next) => {
    setCar(next);
    try {
      await window.storage.set("car-info", JSON.stringify(next));
    } catch (e) {
      setError("Gagal menyimpan data mobil.");
    }
  }, []);

  const persistEntries = useCallback(async (next) => {
    setEntries(next);
    try {
      await window.storage.set("service-entries", JSON.stringify(next));
    } catch (e) {
      setError("Gagal menyimpan riwayat servis.");
    }
  }, []);

  const addEntry = async () => {
    const km = Number(form.km);
    if (!Number.isFinite(km) || km <= 0) {
      setError("Isi kilometer saat servis (angka).");
      return;
    }
    const cost = Number(form.cost || 0);
    if (!Number.isFinite(cost) || cost < 0) {
      setError("Biaya tidak valid.");
      return;
    }
    setError("");
    setSaving(true);
    const entry = {
      id: uid(),
      type: form.type,
      date: form.date,
      km,
      cost,
      notes: form.notes.trim(),
    };
    const next = [entry, ...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
    await persistEntries(next);
    if (km > car.km) {
      await persistCar({ ...car, km });
    }
    setForm({ type: "oli", date: todayStr(), km: "", cost: "", notes: "" });
    setSaving(false);
    setTab("due");
  };

  const deleteEntry = async (id) => {
    await persistEntries(entries.filter((e) => e.id !== id));
  };

  // ---- export functions ----
  const exportJSON = () => {
    const data = { car, entries, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mazda2-servis-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const header = "Tanggal,Jenis,KM,Biaya,Catatan";
    const rows = entries.map((e) => {
      const label = CATALOG.find((c) => c.id === e.type)?.label || e.type;
      const cost = (e.cost || 0).toLocaleString("id-ID");
      const notes = (e.notes || "").replace(/"/g, '""');
      return `"${e.date}","${label}",${e.km},${cost},"${notes}"`;
    });
    const csv = [header, ...rows].join("\n");
    const bom = "\uFEFF"; // UTF-8 BOM for Excel
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mazda2-servis-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- status jatuh tempo per katalog ----
  const today = todayStr();
  const dueList = CATALOG.filter((c) => c.id !== "other").map((c) => {
    const last = entries
      .filter((e) => e.type === c.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    let status = "unknown"; // unknown | ok | soon | due
    let detail = "Belum ada catatan";
    let kmLeft = null;
    let monthsLeft = null;

    if (last) {
      if (c.km) kmLeft = last.km + c.km - car.km;
      if (c.months) monthsLeft = c.months - monthsBetween(last.date, today);
      const kmFlag = kmLeft !== null ? (kmLeft <= 0 ? "due" : kmLeft <= 1000 ? "soon" : "ok") : null;
      const moFlag = monthsLeft !== null ? (monthsLeft <= 0 ? "due" : monthsLeft <= 1 ? "soon" : "ok") : null;
      const flags = [kmFlag, moFlag].filter(Boolean);
      status = flags.includes("due") ? "due" : flags.includes("soon") ? "soon" : "ok";

      const parts = [];
      if (kmLeft !== null) {
        parts.push(
          kmLeft > 0
            ? `${kmLeft.toLocaleString("id-ID")} km lagi`
            : `sudah lewat ${Math.abs(kmLeft).toLocaleString("id-ID")} km`
        );
      }
      if (monthsLeft !== null) {
        parts.push(
          monthsLeft > 0
            ? `${monthsLeft} bln lagi`
            : `sudah lewat ${Math.abs(monthsLeft)} bln`
        );
      }
      detail = `Terakhir ${fmtDate(last.date)} • ${last.km.toLocaleString("id-ID")} km - ${parts.join(", ")}`;
    }
    return { ...c, status, detail, last };
  });

  const totalSpend = entries.reduce((s, e) => s + (e.cost || 0), 0);
  const sortedDue = [...dueList].sort((a, b) => {
    const order = { due: 0, soon: 1, unknown: 2, ok: 3 };
    return order[a.status] - order[b.status];
  });

  const stampStyle = {
    due: "border-accent text-accent bg-accent/5",
    soon: "border-warn text-warn bg-warn/5",
    ok: "border-ok text-ok bg-ok/5",
    unknown: "border-dim text-dim bg-dim/5",
  };
  const stampWord = { due: "DUE", soon: "SOON", ok: "OK", unknown: "-" };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <Loader2 className="animate-spin text-ink" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink pb-10 font-sans">
      {/* Header job-card */}
      <div className="bg-ink text-paper px-5 pt-8 pb-7 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-20 bg-accent" />
        <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-dim mb-2">
          <Wrench size={13} /> Kartu Servis
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight uppercase">
          {car.name}
        </h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-dim">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" /> {car.color}
          </span>
          <span>•</span>
          <span className="font-mono">{car.km.toLocaleString("id-ID")} km</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Gauge size={16} className="text-dim" />
          <label htmlFor="odo" className="sr-only">Odometer sekarang</label>
          <input
            id="odo"
            type="number"
            min="0"
            value={car.km || ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCar({ ...car, km: Number.isFinite(n) ? n : car.km });
            }}
            onBlur={() => {
              if (car.km > 0) persistCar(car); // jangan simpan 0/kosong (data-loss)
            }}
            placeholder="Odometer sekarang"
            className="bg-transparent border-b border-deep focus:border-accent outline-none text-sm py-1 w-40 font-mono"
          />
          <span className="text-xs text-dim">update km terkini</span>
        </div>
      </div>

      {/* perforation */}
      <div className="relative h-3 bg-paper">
        <div className="absolute inset-x-0 top-0 border-t-2 border-dashed border-seam" />
      </div>

      {/* Tabs */}
      <div className="px-5 mt-3 flex gap-2">
        {[
          { id: "due", label: "Pengingat" },
          { id: "add", label: "Tambah" },
          { id: "history", label: "Riwayat" },
          { id: "notes", label: "Catatan" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.id ? "bg-ink text-paper" : "bg-white text-muted border border-line"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-5 mt-3 text-sm text-accent bg-accent/5 border border-accent/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* DUE TAB */}
      {tab === "due" && (
        <div className="px-5 mt-4 space-y-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs uppercase tracking-[0.15em] text-muted">Status perawatan</span>
            <span className="text-xs text-muted">
              Total keluar: <b className="font-mono">{fmtIDR(totalSpend)}</b>
            </span>
          </div>
          {sortedDue.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-line px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-medium text-[15px] truncate">{d.label}</div>
                <div className="text-xs text-muted mt-0.5 truncate">{d.detail}</div>
              </div>
              <div
                className={`shrink-0 border-2 rounded-md px-2 py-1 text-[11px] font-bold tracking-wider -rotate-6 font-display ${stampStyle[d.status]}`}
              >
                {stampWord[d.status]}
              </div>
            </div>
          ))}
          <p className="text-xs text-dim text-center pt-1">
            Interval: kombinasi pengalaman owner 310rb km + rekomendasi inspektor. Lihat tab "Catatan" untuk detail.
          </p>
        </div>
      )}

      {/* ADD TAB */}
      {tab === "add" && (
        <div className="px-5 mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-line p-4 space-y-4">
            <div>
              <label htmlFor="svc-type" className="text-xs uppercase tracking-wider text-muted">Jenis servis</label>
              <select
                id="svc-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full mt-1 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-ink bg-white"
              >
                {CATALOG.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="svc-date" className="text-xs uppercase tracking-wider text-muted flex items-center gap-1">
                  <Calendar size={12} /> Tanggal
                </label>
                <input
                  id="svc-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full mt-1 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-ink font-mono"
                />
              </div>
              <div>
                <label htmlFor="svc-km" className="text-xs uppercase tracking-wider text-muted flex items-center gap-1">
                  <Gauge size={12} /> KM
                </label>
                <input
                  id="svc-km"
                  type="number"
                  min="0"
                  value={form.km}
                  onChange={(e) => setForm({ ...form, km: e.target.value })}
                  placeholder="cth. 45000"
                  className="w-full mt-1 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-ink font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="svc-cost" className="text-xs uppercase tracking-wider text-muted flex items-center gap-1">
                <Banknote size={12} /> Biaya (Rp)
              </label>
              <input
                id="svc-cost"
                type="number"
                min="0"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="cth. 407000"
                className="w-full mt-1 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-ink font-mono"
              />
            </div>

            <div>
              <label htmlFor="svc-notes" className="text-xs uppercase tracking-wider text-muted">Catatan (opsional)</label>
              <textarea
                id="svc-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="cth. bengkel, part, dsb."
                rows={2}
                className="w-full mt-1 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-ink resize-none"
              />
            </div>

            <button
              type="button"
              onClick={addEntry}
              disabled={saving}
              className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Simpan catatan servis
            </button>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div className="px-5 mt-4 space-y-3">
          {entries.length === 0 && (
            <div className="text-center text-sm text-dim py-10">
              Belum ada riwayat servis. Tambahkan dari tab "Tambah".
            </div>
          )}
          {entries.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-line text-muted hover:text-ink hover:border-ink/30 transition-colors"
              >
                <Download size={13} /> JSON
              </button>
              <button
                type="button"
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-line text-muted hover:text-ink hover:border-ink/30 transition-colors"
              >
                <Download size={13} /> CSV
              </button>
            </div>
          )}
          {entries.map((e) => {
            const label = CATALOG.find((c) => c.id === e.type)?.label || e.type;
            return (
              <div
                key={e.id}
                className="bg-white rounded-xl border border-line border-dashed px-4 py-3 relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-[15px]">{label}</div>
                    <div className="text-xs text-muted mt-0.5 font-mono">
                      {fmtDate(e.date)} • {(e.km ?? 0).toLocaleString("id-ID")} km
                    </div>
                    {e.notes && <div className="text-xs text-dim mt-1">{e.notes}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold font-mono">{fmtIDR(e.cost)}</div>
                    <button
                      type="button"
                      onClick={() => deleteEntry(e.id)}
                      aria-label="Hapus catatan"
                      className="text-accent/70 hover:text-accent mt-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <Stamp
                  size={26}
                  className="absolute -right-2 -bottom-2 text-ink/5 rotate-12"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* NOTES TAB */}
      {tab === "notes" && (
        <div className="px-5 mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-line p-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink mb-3">
              📋 Jadwal Perawatan (Inspektor)
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <div className="font-medium">Oli mesin 5W-30 + filter oli</div>
                  <div className="text-xs text-muted">Tiap <b>5.000 km</b> atau maks <b>6 bulan</b></div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <div className="font-medium">Filter udara</div>
                  <div className="text-xs text-muted">Tiap <b>15.000 km</b> atau <b>1 tahun</b></div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <div className="font-medium">Oli matic</div>
                  <div className="text-xs text-muted">Tiap <b>20.000 km</b> atau <b>2 tahun</b></div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">4</span>
                <div>
                  <div className="font-medium">Accu (aki)</div>
                  <div className="text-xs text-muted">Tiap <b>2–3 tahun</b>, rekomendasi <b>45Ah</b></div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">5</span>
                <div>
                  <div className="font-medium">Ban</div>
                  <div className="text-xs text-muted">Tiap <b>60.000 km</b> atau maks <b>5 tahun</b></div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">6</span>
                <div>
                  <div className="font-medium">Wiper</div>
                  <div className="text-xs text-muted">Tiap <b>6 bulan</b> — biar ga baretin kaca</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-line p-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink mb-3">
              ⛽ Tips Hemat BBM
            </h3>
            <ul className="space-y-2 text-sm text-muted list-disc list-inside">
              <li><b>Tekanan ban 32–33 PSI</b> — cek seminggu sekali, kurang 5 PSI = boros 5–10%</li>
              <li><b>Pertalite (RON 90)</b> sudah cukup untuk MZR 1.5L, tidak perlu Pertamax Turbo</li>
              <li><b>Antisipasi lampu merah</b> — lepas gas lebih awal, jangan ngebut lalu rem mendadak</li>
              <li><b>Jaga RPM 2.000–2.500</b> saat cruise — sweet spot mesin MZR</li>
              <li><b>Full-to-full method</b> untuk ukur konsumsi — lebih akurat dari MID</li>
              <li><b>Hindari bawa barang berlebih</b> di bagasi — bobot = BBM</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-line p-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink mb-3">
              🔧 Info Servis
            </h3>
            <ul className="space-y-2 text-sm text-muted list-disc list-inside">
              <li><b>Serpentine belt:</b> kode <b>6PK1840</b>, merek Bando/Ori ~Rp 150–260rb</li>
              <li><b>Bearing tensioner:</b> SKF, ~Rp 60rb/pcs</li>
              <li><b>Bearing magnet clutch AC:</b> NSK, ~Rp 95rb</li>
              <li><b>Beli part sendiri di Shopee</b> — bengkel = jasa pasang saja (hemat 30–50%)</li>
              <li><b>Grup Facebook:</b> "Mazda 2 Non Skyactiv" + "M2Unity" — banyak tips & bengkel rekomendasi</li>
            </ul>
          </div>

          <p className="text-xs text-dim text-center pt-1">
            Sumber: kakak (inspektor) + pengalaman owner 310rb km + komunitas M2Unity
          </p>
        </div>
      )}
    </div>
  );
}