const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "sing",
    aliases: [],
    version: "1.0.1",
    author: "Taha Khan",
    countDown: 5,
    role: 0,
    description: {
      en: "Search Apple Music songs via Nexray API",
      ur: "Apple Music se gaane search karein"
    },
    category: "media",
    guide: {
      en: "{pn} [song name]",
      ur: "{pn} [gaane ka naam]"
    }
  },

  async onStart({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");

    if (!query) {
      return api.sendMessage(
        "❌ **Aapne gaane ka naam nahi likha!**\n\n💡 *Example:* `.sing Waja tum`",
        threadID,
        messageID
      );
    }

    if (api.setMessageReaction) api.setMessageReaction("⌛", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const imagePath = path.join(cacheDir, `sing_${Date.now()}.jpg`);

    try {
      // Fetch Apple Music Results via Nexray API
      const res = await axios.get(`https://api.nexray.eu.cc/search/applemusic?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        timeout: 15000
      });

      const results = res.data?.result;

      if (!results || !Array.isArray(results) || results.length === 0) {
        if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ Is naam ka koi gaana nahi mila!", threadID, messageID);
      }

      const topResults = results.slice(0, 5);
      const numBadges = ["❶", "❷", "❸", "❹", "❺"];

      // Bold & Mota Stylized Search Layout
      let msg = `╭━━━〔 𝗠𝗨𝗦𝗜𝗖 𝗦𝗘𝗔𝗥𝗖𝗛 〕━━━╮\n\n`;

      topResults.forEach((item, index) => {
        msg += `${numBadges[index]} 𝗧𝗶𝘁𝗹𝗲: ${item.title}\n` +
               `🎤 𝗜𝗻𝗳𝗼: ${item.subtitle}\n` +
               `🔗 𝗟𝗶𝗻𝗸: ${item.link}\n` +
               `───────────────────────\n`;
      });

      msg += `\n👑 𝗢𝗪𝗡𝗘𝗥: 𝗧𝗔𝗛𝗔 𝗞𝗛𝗔𝗡\n` +
             `╰━━━━━━━━━━━━━━━━━━━━━╯`;

      // Download HD Cover Image of the Top Match
      let attachment = [];
      const topImage = topResults[0]?.image;

      if (topImage) {
        try {
          const hdImageUrl = topImage.replace("110x110bb-60.jpg", "600x600bb.jpg");

          const imgRes = await axios({
            method: "get",
            url: hdImageUrl,
            responseType: "stream"
          });

          const writer = fs.createWriteStream(imagePath);
          imgRes.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });

          if (fs.existsSync(imagePath)) {
            attachment.push(fs.createReadStream(imagePath));
          }
        } catch (e) {
          console.error("[SING IMAGE ERROR]:", e.message);
        }
      }

      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

      await api.sendMessage(
        {
          body: msg,
          attachment: attachment
        },
        threadID,
        messageID
      );

      // Clean Cache File
      if (fs.existsSync(imagePath)) await fs.unlink(imagePath);

    } catch (err) {
      console.error("[SING SEARCH ERROR]:", err.message);
      if (fs.existsSync(imagePath)) await fs.unlink(imagePath);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ Search me error aaya!", threadID, messageID);
    }
  }
};
