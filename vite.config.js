import { defineConfig } from "vite"
import reactRefresh from "@vitejs/plugin-react-refresh"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [reactRefresh()],
	base: "/app/",
	server: {
		port: 8081,
		proxy: {
			"/api": "http://localhost:8082",
		},
	},
	build: {
		outDir: "./dist",
	},
})
