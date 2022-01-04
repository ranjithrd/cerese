import axios from "axios"

console.log(import.meta.env.MODE)

export const http = axios.create({
	baseURL: (import.meta.env.MODE ?? "") === "development" ? "http://localhost:8082/" : "/",
})
