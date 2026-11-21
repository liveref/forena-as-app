import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 프로젝트 이름과 무관하게 GitHub Pages의 하위 경로에서도 정적 자산을 찾도록 함.
  base: "./",
});
