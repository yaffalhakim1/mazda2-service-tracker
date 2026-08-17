import React, { useState, useEffect, useCallback } from "react";
import { Wrench, Plus, Gauge, Calendar, Banknote, Trash2, Stamp, Loader2 } from "lucide-react";

// ---- Service catalog: interval-based maintenance tracked against km + months ----
// Intervals sourced from a 310rb km non-SkyActiv Mazda2 owner's real-world experience,
// not the generic factory schedule.
const CATALOG = [
  { id: "oli", label: "Ganti oli mesin + filter oli", km: 7000, months: 6 },
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
  { id: "olimatic", label: "Ganti oli matic", km: 35000, months: null },
  { id: "filtermatic", label: "Ganti filter oli matic", km: 100000, months: null },
  { id: "aki", label: "Cek accu (aki)", km: null, months: 18 },
  { id: "ac", label: "Bersihkan evap AC", km: null, months: 12 },
  { id: "racksteer", label: "Cek rack steer / kaki-kaki", km: 20000, months: 12 },
  { id: "spooring", label: "Spooring & balancing", km: 10000, months: null },
  { id: "other", label: "Lainnya", km: null, months: null },
];

const fmtIDR = (n) =>
  "Rp " + Number(n || 0).toLocaleString("id-ID");

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const monthsBetween = (a, b) => {
  const d1 = new Date(a), d2 = new Date(b);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
};

const uid = () => Math.random().toString(36).slice(2, 10);

// ---- Data Claude adds goes here. Bump SEED_VERSION each time you add a new
// entry below — the app auto-applies only what's new since the user's last load. ----
const SEED_VERSION = 11;
const SEED_ENTRIES = [
  { v: 1, id: "seed-oli-0719", type: "oli", date: "2026-07-19", km: 82206, cost: 407000, notes: "Fastron Eco SAE 5W-30 + filter oli (Pertamina). Ganti oli berikutnya di km 87.206" },
  { v: 1, id: "seed-aki-0719", type: "aki", date: "2026-07-19", km: 82296, cost: 830000, notes: "Ganti aki" },
  { v: 2, id: "seed-rack-0725", type: "racksteer", date: "2026-07-25", km: 82296, cost: 1000000, notes: "Servis rack steer + kolom steer, Cahaya Per Bekasi, garansi 6bln" },
  { v: 3, id: "seed-spooring-0726", type: "spooring", date: "2026-07-26", km: 82296, cost: 150000, notes: "Spooring 3D, hasil semua dalam spec" },
  { v: 6, id: "seed-jointsteer", type: "other", date: "2026-07-19", km: 82296, cost: 730000, notes: "Joint steer 530rb + pasang 200rb (tgl perkiraan)" },
  { v: 6, id: "seed-jok", type: "other", date: "2026-07-19", km: 82296, cost: 600000, notes: "Retrim jok kulit (tgl perkiraan)" },
  { v: 6, id: "seed-ban", type: "other", date: "2026-07-19", km: 82296, cost: 1400000, notes: "Ban depan 2pcs (tgl perkiraan)" },
  { v: 6, id: "seed-samsat", type: "other", date: "2026-07-19", km: 82296, cost: 50000, notes: "Cek fisik tempel samsat (tgl perkiraan)" },
  { v: 11, id: "seed-consum-0805", type: "other", date: "2026-08-05", km: 83008, cost: 0, notes: "Catatan konsumsi BBM — AV: 8.9 L/100km (~11.2 km/L). CUR: fluktuasi 7.7–10 L/100km saat jalan (normal, tergantung kondisi)." },
];
const SEED_CAR_KM = 83049;

export default function App() {
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [car, setCar] = useState({ name: "Mazda2 RZ 2013", color: "Merah", km: 0 });
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState("due"); // due | add | history
  const [form, setForm] = useState({
    type: "oli",
    date: new Date().toISOString().slice(0, 10),
    km: "",
    cost: "",
    notes: "",
  });
  const [error, setError] = useState("");

  // ---- load: applies any seed entries newer than what's already been applied ----
  useEffect(() => {
    (async () => {
      let loadedCar = { name: "Mazda2 RZ 2013", color: "Merah", km: 0 };
      let loadedEntries = [];
      let lastVersion = 0;

      try {
        const c = await window.storage.get("car-info");
        if (c?.value) loadedCar = JSON.parse(c.value);
      } catch (e) {}
      try {
        const e = await window.storage.get("service-entries");
        if (e?.value) loadedEntries = JSON.parse(e.value);
      } catch (e) {}
      try {
        const v = await window.storage.get("seed-version");
        if (v?.value) lastVersion = Number(v.value) || 0;
      } catch (e) {}

      const seedIds = new Set(SEED_ENTRIES.map((s) => s.id));
      const untouched = loadedEntries.filter((e) => !seedIds.has(e.id));
      const seedApplied = SEED_ENTRIES.map(({ v, ...rest }) => rest);
      const changed =
        SEED_VERSION > lastVersion ||
        seedApplied.some((s) => {
          const existing = loadedEntries.find((e) => e.id === s.id);
          return !existing || JSON.stringify(existing) !== JSON.stringify(s);
        });

      if (changed) {
        loadedEntries = [...seedApplied, ...untouched].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        try {
          await window.storage.set("service-entries", JSON.stringify(loadedEntries));
        } catch (e) {}
      }

      if (changed) {
        try {
          await window.storage.set("seed-version", String(SEED_VERSION));
        } catch (e) {}
        if (loadedCar.km !== SEED_CAR_KM) {
          loadedCar = { ...loadedCar, km: SEED_CAR_KM };
          try {
            await window.storage.set("car-info", JSON.stringify(loadedCar));
          } catch (e) {}
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
    if (!form.km || Number(form.km) <= 0) {
      setError("Isi kilometer saat servis.");
      return;
    }
    setError("");
    setSaving(true);
    const entry = {
      id: uid(),
      type: form.type,
      date: form.date,
      km: Number(form.km),
      cost: Number(form.cost || 0),
      notes: form.notes.trim(),
    };
    const next = [entry, ...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
    await persistEntries(next);
    if (Number(form.km) > car.km) {
      await persistCar({ ...car, km: Number(form.km) });
    }
    setForm({ type: "oli", date: new Date().toISOString().slice(0, 10), km: "", cost: "", notes: "" });
    setSaving(false);
    setTab("due");
  };

  const deleteEntry = async (id) => {
    await persistEntries(entries.filter((e) => e.id !== id));
  };

  // ---- compute due status per catalog item ----
  const today = new Date().toISOString().slice(0, 10);
  const dueList = CATALOG.filter((c) => c.id !== "other").map((c) => {
    const last = entries
      .filter((e) => e.type === c.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    let status = "unknown"; // unknown | ok | soon | due
    let detail = "Belum ada catatan";
    let kmLeft = null;
    let monthsLeft = null;

    if (last) {
      if (c.km) {
        kmLeft = last.km + c.km - car.km;
      }
      if (c.months) {
        const elapsed = monthsBetween(last.date, today);
        monthsLeft = c.months - elapsed;
      }
      const kmFlag = kmLeft !== null ? (kmLeft <= 0 ? "due" : kmLeft <= 1000 ? "soon" : "ok") : null;
      const moFlag = monthsLeft !== null ? (monthsLeft <= 0 ? "due" : monthsLeft <= 1 ? "soon" : "ok") : null;
      const flags = [kmFlag, moFlag].filter(Boolean);
      status = flags.includes("due") ? "due" : flags.includes("soon") ? "soon" : "ok";

      const parts = [];
      if (kmLeft !== null) parts.push(`${kmLeft > 0 ? kmLeft.toLocaleString("id-ID") + " km lagi" : "sudah lewat " + Math.abs(kmLeft).toLocaleString("id-ID") + " km"}`);
      if (monthsLeft !== null) parts.push(`${monthsLeft > 0 ? monthsLeft + " bln lagi" : "sudah lewat " + Math.abs(monthsLeft) + " bln"}`);
      detail = `Terakhir ${fmtDate(last.date)} • ${last.km.toLocaleString("id-ID")} km — ${parts.join(", ")}`;
    }
    return { ...c, status, detail, last };
  });

  const totalSpend = entries.reduce((s, e) => s + (e.cost || 0), 0);
  const sortedDue = [...dueList].sort((a, b) => {
    const order = { due: 0, soon: 1, unknown: 2, ok: 3 };
    return order[a.status] - order[b.status];
  });

  const stampStyle = {
    due: "border-[#C41230] text-[#C41230] bg-[#C41230]/5",
    soon: "border-[#B8863B] text-[#B8863B] bg-[#B8863B]/5",
    ok: "border-[#3F6B4F] text-[#3F6B4F] bg-[#3F6B4F]/5",
    unknown: "border-[#8A94A0] text-[#8A94A0] bg-[#8A94A0]/5",
  };
  const stampWord = { due: "DUE", soon: "SOON", ok: "OK", unknown: "—" };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EDEFF2]">
        <Loader2 className="animate-spin text-[#1C2126]" size={28} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#EDEFF2] text-[#1C2126] pb-10"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />

      {/* Header job-card */}
      <div className="bg-[#1C2126] text-[#EDEFF2] px-5 pt-8 pb-7 relative overflow-hidden">
        <div
          className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-20"
          style={{ background: "#C41230" }}
        />
        <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#8A94A0] mb-2">
          <Wrench size={13} /> Kartu Servis
        </div>
        <h1
          style={{ fontFamily: "'Oswald', sans-serif" }}
          className="text-2xl font-semibold tracking-tight uppercase"
        >
          {car.name}
        </h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-[#B9C0C9]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C41230] inline-block" /> {car.color}
          </span>
          <span>•</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{car.km.toLocaleString("id-ID")} km</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Gauge size={16} className="text-[#8A94A0]" />
          <input
            type="number"
            value={car.km || ""}
            onChange={(e) => setCar({ ...car, km: Number(e.target.value) })}
            onBlur={() => persistCar(car)}
            placeholder="Odometer sekarang"
            className="bg-transparent border-b border-[#3A4048] focus:border-[#C41230] outline-none text-sm py-1 w-40"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
          <span className="text-xs text-[#8A94A0]">update km terkini</span>
        </div>
      </div>

      {/* perforation */}
      <div className="relative h-3 bg-[#EDEFF2]">
        <div className="absolute inset-x-0 top-0 border-t-2 border-dashed border-[#C9CED5]" />
      </div>

      {/* Tabs */}
      <div className="px-5 mt-3 flex gap-2">
        {[
          { id: "due", label: "Pengingat" },
          { id: "add", label: "Tambah" },
          { id: "history", label: "Riwayat" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.id ? "bg-[#1C2126] text-[#EDEFF2]" : "bg-white text-[#5B6470] border border-[#D8DCE1]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-5 mt-3 text-sm text-[#C41230] bg-[#C41230]/5 border border-[#C41230]/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* DUE TAB */}
      {tab === "due" && (
        <div className="px-5 mt-4 space-y-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs uppercase tracking-[0.15em] text-[#5B6470]">Status perawatan</span>
            <span className="text-xs text-[#5B6470]">
              Total keluar: <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtIDR(totalSpend)}</b>
            </span>
          </div>
          {sortedDue.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-[#D8DCE1] px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-medium text-[15px] truncate">{d.label}</div>
                <div className="text-xs text-[#5B6470] mt-0.5 truncate">{d.detail}</div>
              </div>
              <div
                className={`shrink-0 border-2 rounded-md px-2 py-1 text-[11px] font-bold tracking-wider -rotate-6 ${stampStyle[d.status]}`}
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {stampWord[d.status]}
              </div>
            </div>
          ))}
          <p className="text-xs text-[#8A94A0] text-center pt-1">
            Interval berdasarkan pengalaman owner 310rb km (non-SkyActiv): oli 7.000km/6bln, throttle body & flush 20rb km, busi 50rb km, oli matic 35rb km.
          </p>
        </div>
      )}

      {/* ADD TAB */}
      {tab === "add" && (
        <div className="px-5 mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-[#D8DCE1] p-4 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-[#5B6470]">Jenis servis</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full mt-1 border border-[#D8DCE1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1C2126]"
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
                <label className="text-xs uppercase tracking-wider text-[#5B6470] flex items-center gap-1">
                  <Calendar size={12} /> Tanggal
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full mt-1 border border-[#D8DCE1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1C2126]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[#5B6470] flex items-center gap-1">
                  <Gauge size={12} /> KM
                </label>
                <input
                  type="number"
                  value={form.km}
                  onChange={(e) => setForm({ ...form, km: e.target.value })}
                  placeholder="cth. 45000"
                  className="w-full mt-1 border border-[#D8DCE1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1C2126]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-[#5B6470] flex items-center gap-1">
                <Banknote size={12} /> Biaya (Rp)
              </label>
              <input
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="cth. 407000"
                className="w-full mt-1 border border-[#D8DCE1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1C2126]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-[#5B6470]">Catatan (opsional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="cth. bengkel, part, dsb."
                rows={2}
                className="w-full mt-1 border border-[#D8DCE1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1C2126] resize-none"
              />
            </div>

            <button
              onClick={addEntry}
              disabled={saving}
              className="w-full bg-[#1C2126] text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
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
            <div className="text-center text-sm text-[#8A94A0] py-10">
              Belum ada riwayat servis. Tambahkan dari tab "Tambah".
            </div>
          )}
          {entries.map((e) => {
            const label = CATALOG.find((c) => c.id === e.type)?.label || e.type;
            return (
              <div
                key={e.id}
                className="bg-white rounded-xl border border-[#D8DCE1] border-dashed px-4 py-3 relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-[15px]">{label}</div>
                    <div
                      className="text-xs text-[#5B6470] mt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {fmtDate(e.date)} • {e.km.toLocaleString("id-ID")} km
                    </div>
                    {e.notes && <div className="text-xs text-[#8A94A0] mt-1">{e.notes}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className="text-sm font-semibold"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {fmtIDR(e.cost)}
                    </div>
                    <button
                      onClick={() => deleteEntry(e.id)}
                      className="text-[#C41230]/70 hover:text-[#C41230] mt-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <Stamp
                  size={26}
                  className="absolute -right-2 -bottom-2 text-[#1C2126]/5 rotate-12"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
