import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: change "sercomosa-control-horas" below to match your exact
// GitHub repo name if it's different — GitHub Pages serves the site at
// https://<usuario>.github.io/<nombre-repo>/, and this "base" must match
// that repo name exactly (including case) or the page will load blank.
export default defineConfig({
  plugins: [react()],
  base: "/sercomosa-control-horas/",
});
