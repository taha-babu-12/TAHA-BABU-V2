const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const MAX_MB = 25; // Messenger limit
const TRIES = 5;   // Kitne links try karne hain

// 🔥 Tumhari Videos ki List (Agar koi link mar jaye to naya daal lena)
const LINKS = [...new Set([
	"https://i.imgur.com/FbnZI40.mp4",
	"https://i.imgur.com/E9gbTEZ.mp4",
	"https://i.imgur.com/17nXn9K.mp4",
	"https://i.imgur.com/nj23cCe.mp4",
	"https://i.imgur.com/lMpmBFb.mp4",
	"https://i.imgur.com/85iuBp2.mp4",
	"https://i.imgur.com/R3XHTby.mp4",
	"https://i.imgur.com/qX2HUXp.mp4",
	"https://i.imgur.com/MYn0ese.mp4",
	"https://i.imgur.com/yipoKec.mp4",
	"https://i.imgur.com/0tFSIWT.mp4",
	"https://i.imgur.com/BzP6eD8.mp4",
	"https://i.imgur.com/aDlwRWy.mp4",
	"https://i.imgur.com/l3c86M3.mp4",
	"https://i.imgur.com/lfjT7bx.mp4",
	"https://i.imgur.com/Zp5sci1.mp4",
	"https://i.imgur.com/S6rHOc1.mp4",
	"https://i.imgur.com/cAHRfq3.mp4",
	"https://i.imgur.com/zzqEWkN.mp4",
	"https://i.imgur.com/fL1igWD.mp4",
	"https://i.imgur.com/ZRt0bGT.mp4",
	"https://i.imgur.com/fAKWP0W.mp4"
])];

module.exports = {
	config: {
		name: "segs",
		aliases: ["seg"],
		version: "9.0.0",
		author: "TAHA KHAN", // Author change kar diya
		countDown: 5,
		role: 0,
		category: "video",
		description: { en: "Random video sender" },
		guide: { en: "{pn}\n{pn} check (Admin only)" }
	},

	// 🛡️ Video Download aur Check function
	async downloadVideo(url, filePath) {
		const res = await axios.get(url, {
			responseType: "stream",
			timeout: 30000,
			maxRedirects: 3,
			headers: { "User-Agent": "Mozilla/5.0", Referer: "https://imgur.com/" },
			validateStatus: s => s === 200
		});

		const type = String(res.headers["content-type"] || "");
		const len = +res.headers["content-length"] || 0;

		if (!/video|octet-stream/i.test(type)) {
			res.data.destroy();
			throw new Error("Ye video nahi hai");
		}
		if (len > MAX_MB * 1024 * 1024) {
			res.data.destroy();
			throw new Error("File 25MB se bari hai");
		}

		const writer = fs.createWriteStream(filePath);
		res.data.pipe(writer);

		await new Promise((resolve, reject) => {
			writer.on("finish", resolve);
			writer.on("error", reject);
		});

		return true;
	},

	onStart: async function ({ api, event, message, args }) {
		const { threadID, messageID, senderID } = event;
		const cacheDir = path.join(__dirname, "cache");
		await fs.ensureDir(cacheDir);

		// ================== CHECK COMMAND (Admin Only) ==================
		if ((args[0] || "").toLowerCase() === "check") {
			const admins = (global.GoatBot?.config?.adminBot) || [];
			if (!admins.includes(String(senderID))) {
				return message.reply("⚠️ Bhai, ye command sirf Admin use kar sakta hai.");
			}

			const waitMsg = await message.reply(`🔎 Bhai, ${LINKS.length} links check kar raha hoon...`);
			const deadLinks = [];

			for (let i = 0; i < LINKS.length; i += 5) {
				const batch = LINKS.slice(i, i + 5);
				await Promise.all(batch.map(async (url) => {
					try {
						const res = await axios.get(url, { timeout: 5000, headers: { "User-Agent": "Mozilla/5.0" } });
						if (res.status !== 200) deadLinks.push(url);
					} catch (e) {
						deadLinks.push(url);
					}
				}));
			}

			try { if (waitMsg && waitMsg.messageID) api.unsendMessage(waitMsg.messageID); } catch (e) {}

			return message.reply(
				`╭─────────────────────╮\n` +
				`     🔎 𝐋𝐢𝐧𝐤 𝐂𝐡𝐞𝐜𝐤 🔎\n` +
				`╰─────────────────────╯\n\n` +
				`✅ 𝐖𝐨𝐫𝐤𝐢𝐧𝐠 : ${LINKS.length - deadLinks.length}\n` +
				`❌ 𝐃𝐞𝐚𝐝 : ${deadLinks.length}\n\n` +
				(deadLinks.length ? `📌 𝐃𝐞𝐚𝐝 𝐋𝐢𝐧𝐤𝐬:\n${deadLinks.join("\n")}\n\n` : "") +
				`👉 In dead links ko naye links se replace karo.`
			);
		}

		// ================== RANDOM VIDEO SENDER ==================
		if (api.setMessageReaction) api.setMessageReaction("⏳", messageID, () => {}, true);

		// Links ko shuffle karo aur top 5 uthao
		const pool = [...LINKS].sort(() => Math.random() - 0.5).slice(0, TRIES);
		let lastErr = "";
		let success = false;

		for (const url of pool) {
			const filePath = path.join(cacheDir, `segs_${senderID}_${Date.now()}.mp4`);
			try {
				// 1. Video download karo
				await this.downloadVideo(url, filePath);

				// 2. Check karo ke file valid hai ya nahi
				const stats = await fs.stat(filePath);
				if (stats.size < 1024) throw new Error("File khali hai");

				// 3. Send Video
				if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);
				
				await message.reply({
					body: 
						`╭─────────────────────╮\n` +
						`     🎬 𝐒.𝐄.𝐆.𝐒 🎬\n` +
						`╰─────────────────────╯\n\n` +
						`✨ Lijiye aapki video hazir hai!\n` +
						`💖 Enjoy karo.\n\n` +
						`┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
						`    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
						`┗━━━━━━━━━━━━━━━━━━━━━┛`,
					attachment: fs.createReadStream(filePath)
				});

				// Cleanup
				setTimeout(() => fs.unlink(filePath).catch(() => {}), 5000);
				
				success = true;
				break; // Loop se bahar nikal jao
			} catch (e) {
				lastErr = e.message;
				await fs.unlink(filePath).catch(() => {});
				console.error("[segs] Failed:", url, e.message);
			}
		}

		if (!success) {
			if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
			return message.reply(
				`❌ Bhai, is waqt koi video nahi mil rahi. Shayad saare links dead ho gaye hain.\n\n` +
				`📌 Wajah: ${lastErr}\n\n` +
				`👉 Admin \`segs check\` chala kar dead links check karein.`
			);
		}
	}
};