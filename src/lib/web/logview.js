import { Logger } from "../logger.js";
export class Logview {
	constructor({ host = process.env.WEB_HOST, key = process.env.WEB_KEY }) {
		this.host = host || process.env.WEB_HOST;
		this.key = key || process.env.WEB_KEY;
		this.logger = new Logger({ callsystem: "web logview" });
	}

	async get() {
		return {};
	}

	async create(content) {
		const baseURL = new URL(this.host);
		const request = await fetch(baseURL.origin + "/create", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.key}`,
			},
			body: JSON.stringify({
				content,
			}),
		}).then((r) => r.json());

		return {
			...request,
			url: baseURL.origin + "/" + request.id,
		};
	}
}
