/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Palet kartu servis (job-card): ink & paper sebagai base,
        // accent merah tua ala Mazda untuk penekanan.
        ink: "#1C2126",
        paper: "#EDEFF2",
        deep: "#3A4048", // garis di atas latar gelap
        line: "#D8DCE1", // border kartu
        seam: "#C9CED5", // perforation
        muted: "#5B6470", // teks sekunder di latar terang
        dim: "#8A94A0", // teks sekunder di latar gelap / paling redup
        accent: "#C41230",
        ok: "#3F6B4F",
        warn: "#B8863B",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Oswald", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};