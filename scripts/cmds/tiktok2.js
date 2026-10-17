const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "tiktok2",
    aliases: ["tt2", "ttsearch2"],
    version: "1.0.4",
    author: "Taha Khan",
    countDown: 5,
    role: 0,
    description: {
      en: "Search and download TikTok videos via Nexray API",
      ur: "Nexray API ke zariye TikTok video search aur download karein"
    },
    category: "media",
    guide: {
      en: "{pn} [search query / link]",
      ur: "{pn} [search text / link]"
    }
  },

  async onStart({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");

    if (!query) {
      return api.sendMessage(
        "❌ **Aapne search term nahi likha!**\n\n💡 *Istemaal ka tarika:* `.tiktok2 sad status` ya `.tiktok2 [video link]`",
        threadID,
        messageID
      );
    }

    if (api.setMessageReaction) api.setMessageReaction("⌛", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `tiktok2_${Date.now()}.mp4`);

    try {
      const res = await axios.get(`https://api.nexray.eu.cc/search/tiktok?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        timeout: 15000
      });

      const resData = res.data;
      let item = null;

      // Extract result array from Nexray JSON response
      if (resData && resData.result && Array.isArray(resData.result) && resData.result.length > 0) {
        item = resData.result[0];
      } else if (Array.isArray(resData) && resData.length > 0) {
        item = resData[0];
      } else if (resData && resData.data) {
        item = Array.isArray(resData.data) ? resData.data[0] : resData.data;
      }

      // Exact Nexray API response mapping
      const videoUrl = item?.data || item?.play || item?.video || item?.download_url || item?.url || item?.noWatermark;
      const title = item?.title || query;
      const author = item?.author?.fullname || item?.author?.nickname || "TikTok Creator";

      if (!videoUrl) {
        if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ Video link nahi mil saka! Dusra keyword try karein.", threadID, messageID);
      }

      // Stream download to local cache
      const response = await axios({
        method: "get",
        url: videoUrl,
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

      // Send Video Attachment
      await api.sendMessage(
        {
          body: `🎵 **𝙏𝙄𝙆𝙏𝙊𝙆 𝙎𝙀𝘼𝙍𝘾𝙃 & 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿** 🎵\n━━━━━━━━━━━━━━━━━━━━\n📝 **Title:** ${title}\n👤 **Author:** ${author}\n👑 ៚✰𝐎𝐖𝐍𝐄𝐑✰ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍\n\n✨ *𝐘𝐀 𝐋𝐎 𝐁𝐀𝐁𝐘 𝐀𝐏𝐊𝐈 𝐕𝐈𝐃𝐄𝐎 𝐑𝐑𝐀𝐃𝐘 𝐇𝐀i!*`,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        messageID
      );

      if (fs.existsSync(filePath)) await fs.unlink(filePath);

    } catch (err) {
      console.error("[TIKTOK2 CMD ERROR]:", err.message);
      if (fs.existsSync(filePath)) await fs.unlink(filePath);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ Video download karne me error aaya!", threadID, messageID);
    }
  }
};
