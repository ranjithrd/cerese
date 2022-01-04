const express = require("express")
const routes = require("./server/server.js")

console.log("DEBUG MODE")

const app = express()

app.use("/app", express.static(`${__dirname}/dist`))
app.use("/", routes)

app.listen(8082, () => {
	console.log("Debug listening on 8082.")
})
