const rnd = (
	len,
	chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
) =>
	[...Array(len)]
		.map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
		.join("")

const blacklist = [
	"APP_requests",
	"APP_created",
	"APP_redirects",
	"APP_json",
	"redirects",
]

const express = require("express")
const Handlebars = require("handlebars")
const dotenv = require("dotenv")
const Redis = require("ioredis")
const cors = require("cors")
const bodyParser = require("body-parser")

dotenv.config()

const REDIS_CONFIG = {
	port: 6379,
	host: "127.0.0.1",
}

const redis = new Redis(REDIS_CONFIG)

const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

async function getFinalIdAndUrl(req, res, update) {
	const body = req.body ?? {}
	console.log(body)
	const newId = body.id
	const newUrl = body.url
	if (!newUrl) {
		res.send({ error: "Url not entered" })
		return []
	}
	const valid =
		/^(http(s?)\:\/\/|~\/|\/)?([a-zA-Z]{1}([\w\-]+\.)+([\w]{2,5}))(:[\d]{1,5})?\/?(\w+\.[\w]{3,4})?((\?\w+=\w+)?(&\w+=\w+)*)?/gm.test(
			newUrl
		)
	if (!valid) {
		res.send({ error: "Invalid Url" })
		return []
	}
	let finalId = ""
	if (newId) {
		if (newId.length > 16 || newId.length < 4) {
			res.send({
				error: "Choose a url with a minimum of 4 and a maximum of 16 characters",
			})
			return []
		}
		if (!/^[a-zA-Z0-9_-]*$/.test(newId)) {
			res.send({
				error: "Make sure you only use digits, letters, hyphens, or underscores",
			})
			return []
		}
		if (update !== true) {
			const alreadyTaken = (await redis.exists(newId)) > 0
			if (alreadyTaken || blacklist.indexOf(newId) > -1) {
				res.send({
					error: "Choose another url, this one's already taken",
				})
				return []
			} else {
				finalId = newId
			}
		} else {
			finalId = newId
		}
	} else {
		finalId = rnd(6)
	}
	return [finalId, newUrl]
}

app.get("/v", (_, res) => res.send(`<h1>App running on ${PORT}</h1>`))

app.get("/redirects", async (_, res) =>
	res.send(await redis.get("APP_redirects"))
)

app.get("/", (_, res) => {
	res.redirect("/app")
})

app.get("/server-url", (req, res) => {
	const fUrl = `${req.get("host")}`
	res.send(fUrl)
})

app.get("/urls", async (req, res) => {
	redis.incr("APP_requests")
	try {
		const data = JSON.parse((await redis.get("APP_json")) ?? "{}")
		res.send(data)
		return
	} catch (e) {
		res.send({ error: e })
	}
})

app.get("/counts/:id", async (req, res) => {
	try {
		if (!req.params.id) {
			res.send({ error: "ID not sent" })
			return
		}
		const data = await redis.get(`${req.params?.id}_count`)
		res.send([req.params?.id, data])
	} catch (e) {
		res.send({ error: e })
	}
})

app.post("/create", async (req, res) => {
	redis.incr("APP_requests")
	try {
		const result = await getFinalIdAndUrl(req, res)
		console.log(result)
		console.log(result.length < 1)
		if (result.length < 1) {
			return
		}
		console.log("result valid")
		const [finalId, newUrl] = result
		const finalIdKey = `${finalId}`
		const finalCount = `${finalIdKey}_count`
		await redis.set(finalIdKey, newUrl)
		await redis.set(finalCount, "0")
		const oldJson = JSON.parse((await redis.get("APP_json")) ?? "{}")
		await redis.set(
			"APP_json",
			JSON.stringify({
				[finalIdKey]: newUrl,
				...oldJson,
			})
		)
		redis.incr("APP_created")
		res.end()
	} catch (e) {
		res.send({ error: e })
	}
})

app.post("/update", async (req, res) => {
	redis.incr("APP_requests")
	try {
		const result = await getFinalIdAndUrl(req, res, true)
		if (result.length < 1) {
			return
		}
		const [finalId, newUrl] = result
		const finalIdKey = `${finalId}`
		const finalCount = `${finalIdKey}_count`
		const oldId = `${req.body.oldId}`
		const oldCount = `${oldId}_count`
		if (!oldId) {
			res.send({ error: "Old ID not sent" })
			return
		}
		const oldJson = JSON.parse((await redis.get("APP_json")) ?? "{}")
		await redis.set(
			"APP_json",
			JSON.stringify(
				Object.fromEntries(
					Object.entries(oldJson).filter(
						([key]) => key !== `${oldId}`
					)
				)
			)
		)
		const newData = JSON.parse((await redis.get("APP_json")) ?? "{}")
		if (oldId === finalId) {
			await redis.set(finalIdKey, newUrl)
		} else {
			await redis.rename(oldId, finalIdKey)
			await redis.rename(oldCount, finalCount)
			await redis.set(finalIdKey, newUrl)
		}
		await redis.set(
			"APP_json",
			JSON.stringify({
				[finalIdKey]: newUrl,
				...newData,
			})
		)
		res.end()
	} catch (e) {
		console.log(e)
		res.send({ error: e })
	}
})

app.post("/delete", async (req, res) => {
	redis.incr("APP_requests")
	try {
		const id = req.body.id
		if (!id) {
			res.send({ error: "ID not sent" })
			return
		}
		await redis.del(`${id}`)
		await redis.del(`${id}_count`)
		const oldJson = JSON.parse((await redis.get("APP_json")) ?? "{}")
		await redis.set(
			"APP_json",
			JSON.stringify(
				Object.fromEntries(
					Object.entries(oldJson).filter(([key]) => key !== `${id}`)
				)
			)
		)
		res.end()
	} catch (e) {
		res.send({ error: e })
	}
})

app.get("/:id", async (req, res) => {
	redis.incr("APP_requests")
	try {
		const id = req.params?.id ?? ""
		if (id === "") {
			res.redirect("/")
			return
		}
		const data = await redis.get(`${id}`)
		if (!data) {
			res.send(`Couldn't find this URL.`)
			return
		}
		res.redirect(301, data)
		redis.incr(`${id}_count`)
		redis.incr("APP_redirects")
	} catch (e) {
		res.send(`Error: ${e}`)
	}
})

module.exports = app
