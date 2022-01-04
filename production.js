const express = require("express")
const routes = require("./server/server.js")
const dotenv = require("dotenv")

console.log("PRODUCTION MODE")

dotenv.config()

const PORT = process.env.PORT || 8080

const app = express()
app.use("/app", express.static(`${__dirname}/dist`))
app.use("/", routes)

try {
	app.listen(PORT, () => {
		console.log(`Listening on port ${PORT}`)
	})
} catch (e) {
	console.log("Error")
	console.error(e)
}
