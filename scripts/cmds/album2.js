const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");

module.exports = {
  config: {
    name: "album2",
    aliases: ["alb2", "tiktoksearch"],
    version: "1.0.0",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    description: {
      en: "Search and download media using second TikTok API via stylish layout",
      ur: "Doosri TikTok API se stylish layout mein media download karein"
    },
    category: "media",
    guide: {
      en: "{pn} <query>\nExample: {pn} Hot",
      ur: "{pn} <naam>"
    }
  },

  MAX_FILE_SIZE: 25 * 1024 * 1024,

  fileSizeGuard(maxBytes) {
    let received = 0;
    return new Transform({
      transform(chunk, _, cb) {
        received += chunk.length;
        if (received > maxBytes) {
          const e = new Error("File size limit exceeded");
          e.code = "TOO_LARGE";
          return cb(e);
        }
        cb(null, chunk);
      }
    });
  },

  async onStart({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;
    const userQuery = args.join(" ");

    if (!userQuery) {
      return message.reply(
        "┏━━━ ⚠️ ERROR ⚠️ ━━━┓\n" +
        "┃ Baraye meharbani kuch likhein.\n" +
        "┃ Example: /album2 Hot\n" +
        "┗━━━━━━━━━━━━━━━━━┛"
      );
    }

    if (api.setMessageReaction) api.setMessageReaction("⏳", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `album2_${senderID}_${Date.now()}.mp4`);

    try {
      // Local/regional mix terms taaki Pakistani aur regional content zyada preference pe aaye
      const searchTerms = [
        `${userQuery} pakistani girl edit`,
        `${userQuery} urdu status`,
        `${userQuery} viral`,
        userQuery
      ];

      const randomQuery = searchTerms[Math.floor(Math.random() * searchTerms.length)];

      // Aap ki di gayi nayi TikTok API endpoint
      const apiUrl = `https://api.nexray.eu.cc/search/tiktok?q=${encodeURIComponent(randomQuery)}`;
      const { data } = await axios.get(apiUrl, { timeout: 25000 });

      if (!data || !data.status || !data.result || data.result.length === 0) {
        throw new Error("Is naam se koi media nahi mili.");
      }

      // Randomizer taaki har baar mukhtalif video aaye
      const results = data.result;
      const randomIndex = Math.floor(Math.random() * Math.min(results.length, 10));
      const item = results[randomIndex];

      const videoUrl = item.data;
      const title = item.title || "Exclusive Media";
      const authorName = item.author?.fullname || item.author?.nickname || "Creator";

      if (!videoUrl) {
        throw new Error("Download link nahi mil saka.");
      }

      const res = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream",
        timeout: 60000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      await pipeline(
        res.data,
        this.fileSizeGuard(this.MAX_FILE_SIZE),
        fs.createWriteStream(filePath)
      );

      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

      const msgBody = 
        `┏━━━ 🎬 ALBUM 2 PLAYER ━━━┓\n` +
        `┃ Title: ${title.substring(0, 50)}\n` +
        `┃ Creator: ${authorName}\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
        `Powered by TAHA KHAN`;

      await api.sendMessage({
        body: msgBody,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }, messageID);

    } catch (err) {
      console.error("[Album2 Error]", err.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
      
      return message.reply(
        `┏━━━ ❌ FAILED ❌ ━━━┓\n` +
        `┃ ${err.message}\n` +
        `┗━━━━━━━━━━━━━━━━━┛`
      );
    }
  }
};
