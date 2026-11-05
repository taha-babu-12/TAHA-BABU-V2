const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

const API_ORIGIN = "https://yt-mian-amir.vercel.app";
const API_ENDPOINT = API_ORIGIN + "/api/link";
const MAX_FILE_MB = 24; // Facebook limit

const YT_URL = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/\S+/i;

module.exports = {
  config: {
    name: "play",
    aliases: [], // 🔥 Saare aliases hata diye hain
    version: "5.0.2",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    category: "media",
    description: { en: "Direct YouTube Audio/Video Downloader" },
    guide: { en: "{pn} <song> | {pn} video <song>" }
  },

  // 🎨 Stylish UI Helpers
  styleText(text, type) {
    const fonts = {
      bold: { a: "𝐚", b: "𝐛", c: "𝐜", d: "𝐝", e: "𝐞", f: "𝐟", g: "𝐠", h: "𝐡", i: "𝐢", j: "𝐣", k: "𝐤", l: "𝐥", m: "𝐦", n: "𝐧", o: "𝐨", p: "𝐩", q: "𝐪", r: "𝐫", s: "𝐬", t: "𝐭", u: "𝐮", v: "𝐯", w: "𝐰", x: "𝐱", y: "𝐲", z: "𝐳", A: "𝐀", B: "𝐁", C: "𝐂", D: "𝐃", E: "𝐄", F: "𝐅", G: "𝐆", H: "𝐇", I: "𝐈", J: "𝐉", K: "𝐊", L: "𝐋", M: "𝐌", N: "𝐍", O: "𝐎", P: "𝐏", Q: "𝐐", R: "𝐑", S: "𝐒", T: "𝐓", U: "𝐔", V: "𝐕", W: "𝐖", X: "𝐗", Y: "𝐘", Z: "𝐙" }
    };
    const map = fonts[type] || fonts.bold;
    return String(text).split("").map(c => map[c] || c).join("");
  },

  // ================== HELPERS ==================
  absoluteUrl(u) {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    return API_ORIGIN + (u.startsWith("/") ? "" : "/") + u;
  },

  async getInfo(url, isVideo) {
    const format = isVideo ? "360" : "mp3";
    const apiUrl = `${API_ENDPOINT}?url=${encodeURIComponent(url)}&format=${format}`;
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await axios.get(apiUrl, { timeout: 120000, headers: { "User-Agent": "Mozilla/5.0" } });
        if (res.data && (res.data.download_url || res.data.upstream_url)) return res.data;
      } catch (e) {
        if (attempt === 2) throw e;
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    throw new Error("API se link nahi mila.");
  },

  async downloadFile(info, filePath) {
    const sources = [info.download_url, info.upstream_url].filter(Boolean).map(u => this.absoluteUrl(u));
    let lastErr;

    for (const src of sources) {
      try {
        await new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(filePath);
          axios({
            url: src, method: "GET", responseType: "stream", timeout: 180000,
            headers: { "User-Agent": "Mozilla/5.0" }
          }).then(res => {
            const type = String(res.headers["content-type"] || "");
            if (/json|html|text/i.test(type)) {
              res.data.destroy(); writer.destroy();
              return reject(new Error("File ki jagah text aaya"));
            }
            res.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
            res.data.on("error", e => { writer.destroy(); reject(e); });
          }).catch(e => { try { fs.unlinkSync(filePath); } catch (e2) {} reject(e); });
        });
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) return;
        throw new Error("File khali hai");
      } catch (e) {
        try { fs.unlinkSync(filePath); } catch (e2) {}
        lastErr = e;
      }
    }
    throw lastErr || new Error("Download fail hua");
  },

  // ================== MAIN COMMAND ==================
  async onStart({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;
    const prefix = global.GoatBot?.config?.prefix || ".";

    if (!args.length) {
      return message.reply(
        `╭─────────────────────╮\n` +
        `     🎵 𝐏𝐥𝐚𝐲 𝐁𝐨𝐭 🎵\n` +
        `╰─────────────────────╯\n\n` +
        `📌 ${prefix}play <gaana> (Audio)\n` +
        `📌 ${prefix}play video <gaana> (Video)\n\n` +
        `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
        `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━┛`
      );
    }

    let input = args.join(" ").trim();
    let isVideo = false;
    
    if (input.toLowerCase().startsWith("video ")) {
      isVideo = true;
      input = input.slice(6).trim();
    } else if (input.toLowerCase().startsWith("audio ")) {
      isVideo = false;
      input = input.slice(6).trim();
    }

    if (!input) input = "mix";

    if (YT_URL.test(input)) {
      return this.deliverMedia(api, event, { url: input, title: "YouTube Media", author: { name: "Unknown" } }, isVideo);
    }

    try {
      if (api.setMessageReaction) api.setMessageReaction("⌛", messageID, () => {}, true);
      await message.reply(`🔎 Bhai, "${input}" dhoondh raha hoon...`);

      const r = await ytSearch(input);
      const vids = ((r && r.videos) || []).filter(v => v && v.seconds > 0);
      
      if (!vids.length) throw new Error("Kuch nahi mila.");

      const bestMatch = vids[0];
      await this.deliverMedia(api, event, bestMatch, isVideo);

    } catch (error) {
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ Error: ${error.message}\n👉 Gaane ka naam sahi likho.`);
    }
  },

  // ================== DELIVER MEDIA ==================
  async deliverMedia(api, event, video, isVideo) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `play_${senderID}_${Date.now()}.${isVideo ? "mp4" : "mp3"}`);

    try {
      const waitMsg = await api.sendMessage("📥 𝐋𝐢𝐧𝐤 𝐌𝐢𝐥 𝐆𝐚𝐲𝐚, 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐇𝐨 𝐑𝐚𝐡𝐚 𝐇𝐚𝐢...", threadID);

      const info = await this.getInfo(video.url, isVideo);
      await this.downloadFile(info, filePath);

      const fileSizeMB = fs.statSync(filePath).size / (1024 * 1024);
      const directLink = this.absoluteUrl(info.download_url || info.upstream_url);

      if (fileSizeMB > MAX_FILE_MB) {
        try { fs.unlinkSync(filePath); } catch (e) {}
        if (waitMsg) api.unsendMessage(waitMsg.messageID);
        
        return api.sendMessage(
          `╭─────────────────────╮\n` +
          `     ⚠️ 𝐅𝐢𝐥𝐞 𝐓𝐨𝐨 𝐋𝐚𝐫𝐠𝐞 ⚠️\n` +
          `╰─────────────────────╯\n\n` +
          `📌 Size: ${fileSizeMB.toFixed(2)}MB (Limit: 24MB)\n\n` +
          `🔗 Direct Link:\n${directLink}`,
          threadID
        );
      }

      const caption = 
        `╭─────────────────────╮\n` +
        `     ${isVideo ? '🎬 𝐕𝐢𝐝𝐞 ✨' : '🎵 𝐀𝐮𝐝𝐢 ✨'}\n` +
        `╰─────────────────────╯\n\n` +
        `📝 Title : ${String(video.title || "Unknown").slice(0, 50)}\n` +
        `👤 Artist : ${video.author?.name || "Unknown"}\n` +
        `⏱ Duration : ${video.timestamp || "N/A"}\n\n` +
        `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
        `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━┛`;

      if (waitMsg) api.unsendMessage(waitMsg.messageID);

      api.sendMessage({
        body: caption,
        attachment: fs.createReadStream(filePath)
      }, threadID, (err) => {
        if (!err && api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);
        try { fs.unlinkSync(filePath); } catch (e) {}
      });

    } catch (error) {
      console.error("[Play Error]", error.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
      return api.sendMessage(`❌ Failed: ${error.message}`, threadID, messageID);
    }
  }
};