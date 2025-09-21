import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // biar bisa diakses dari luar container
    port: 5173,
    strictPort: true,
    allowedHosts: [
      "absen.damantine.web.id",
      "localhost",
      "127.0.0.1",
      "https://a1e5b9ec765b.ngrok-free.app",
    ],
  },
});
