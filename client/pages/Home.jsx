import React, { useEffect, useState } from "react"
import { http } from "../http"

function Home() {
	const [error, setError] = useState("")
	const [refreshData, setRefreshData] = useState(0)
	const [data, setData] = useState([])
	const [editingLink, setEditingLink] = useState()
	const [newData, setNewData] = useState({ id: "", link: "" })
	const [clicks, setClicks] = useState([{}, 0])

	useEffect(() => {
		;(async () => {
			console.log(refreshData)
			console.log("refreshing data...")
			const { data: urls } = await http.get("/urls")
			console.log(urls)
			if (urls.error) {
				setError(urls.error)
			} else {
				setData(Object.entries(urls))
			}
		})()
	}, [refreshData])

	useEffect(() => {
		console.log("Change in edit.")
		if (editingLink) {
			console.log(editingLink)
			setNewData({ id: editingLink.id, link: editingLink.link })
		} else {
			setNewData({ id: "", link: "" })
		}
	}, [editingLink])

	async function handleSubmit(e) {
		setError("")
		e.preventDefault()
		const id = newData.id
		const url = newData.link
		if (!id || !url) {
			setError("Fill out all fields")
			return
		}
		if (editingLink) {
			const { data } = await http.post("/update", {
				oldId: editingLink.oldId,
				id,
				url,
			})
			if (data?.error) {
				setError(data?.error)
			} else {
				setRefreshData(refreshData + 1)
				setEditingLink()
			}
			return
		} else {
			const { data } = await http.post("/create", {
				id,
				url,
			})
			if (data?.error) {
				setError(data?.error)
			} else {
				setRefreshData(refreshData + 1)
			}
		}
		setNewData({ id: "", link: "" })
	}

	function handleEdit(url) {
		setEditingLink({
			oldId: url[0],
			id: url[0],
			link: url[1],
		})
	}

	async function handleDelete(url) {
		const conf = await confirm(
			`Are you sure you want to delete this link: ${url[1]}`
		)
		if (!conf) return
		const { data } = await http.post("/delete", {
			id: url[0],
		})
		if (data?.error) {
			setError(data?.error)
		} else {
			setRefreshData(refreshData + 1)
		}
	}

	async function handleCounts(url) {
		const { data } = await http.get(`/counts/${url[0]}`)
		if (data?.error) {
			setError(data?.error)
		} else {
			setClicks(data ?? 0)
		}
	}

	async function handleCopy(urlKey) {
		const { data: serverUrl } = await http.get("/server-url")
		navigator.clipboard.writeText(`${serverUrl}/${urlKey}`)
	}

	return (
		<main>
			<div className="space-between">
				<h1>Cerese</h1>
				<button>Logout</button>
			</div>
			<p>The simplest URL shortener out there.</p>
			<form onSubmit={handleSubmit}>
				<h3>{editingLink ? "Update this link" : "Create a link"}</h3>
				<div className="input">
					<label htmlFor="id">
						Backhalf of url (.e.g <code>/my-promotion</code>)
					</label>
					<div className="row">
						<p>/</p>
						<input
							type="text"
							name="id"
							placeholder="E.g my-promotion"
							className="full-width"
							value={newData.id}
							onChange={(e) =>
								setNewData({ ...newData, id: e.target.value })
							}
						/>
					</div>
				</div>
				<div className="input">
					<label htmlFor="id">Redirect to</label>
					<input
						type="text"
						name="url"
						placeholder="E.g https://google.com"
						value={newData.link}
						onChange={(e) =>
							setNewData({ ...newData, link: e.target.value })
						}
					/>
				</div>
				<p className="error">{error}</p>
				<button type="submit">
					{editingLink ? "Update" : "Create"}
				</button>
			</form>
			<div className="spacer"></div>
			<h3>Links</h3>
			<div className="responsive">
				{data.map((url) => (
					<div className="card" key={url[0]}>
						<div className="space-between">
							<h4>/{url[0]}</h4>
							<button
								className="bold"
								onClick={() => handleCopy(url[0])}
							>
								Copy
							</button>
						</div>
						<a href={url[1]} className="gray small" target="_blank">
							{url[1]}
						</a>
						<div className="space-between">
							<button onClick={() => handleEdit(url)}>
								Edit
							</button>
							{clicks[0] === url[0] ? (
								<p>
									{clicks[1] ?? 0}{" "}
									{(clicks[1] ?? 0) === 1
										? "click"
										: "clicks"}
								</p>
							) : (
								<button onClick={() => handleCounts(url)}>
									View Clicks
								</button>
							)}
						</div>
						<button
							className="gray"
							onClick={() => handleDelete(url)}
						>
							Delete
						</button>
					</div>
				))}
			</div>
			<div className="spacer">{" "}</div>
			<div>
				<p>Free and open source.</p>
				<p>
					<a
						href="https://github.com/ranjithrd/cerese"
						target="_blank"
						className="primary"
					>
						GitHub
					</a>
				</p>
			</div>
			<div className="spacer">{" "}</div>
			<div className="spacer">{" "}</div>
		</main>
	)
}

export default Home
