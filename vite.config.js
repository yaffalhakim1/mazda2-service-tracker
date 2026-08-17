import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base = repo name so it works under https://yaffalhakim1.github.io/mazda2-service-tracker/
export default defineConfig({
  plugins: [react()],
  base: "/mazda2-service-tracker/",
});