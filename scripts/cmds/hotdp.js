const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "hotdp",
    aliases: [], 
    version: "3.0.0",
    author: "TAHA KHAN",
    countDown: 3,
    role: 0,
    category: "image",
    description: { en: "Get a High-Quality Hot DP from Pinterest", ur: "High-Quality Hot DP hasil karo" },
    guide: { en: "{pn}", ur: "{pn}" }
  },

  QUERIES: [
    "Hot+dpz+",
    "stylish+girl+dp",
    "cute+girl+dp",
    "aesthetic+girl+dp"
  ],

  async onStart({ api, event, message }) {
    const { threadID, messageID, senderID } = event;

    if (api.setMessageReaction) api.setMessageReaction("⏳", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `hotdp_${senderID}_${Date.now()}.jpg`);

    let success = false;
    let errorMsg = "";

    for (const query of this.QUERIES) {
      if (success) break;
      
      try {
        const url = `https://api.nexray.eu.cc/search/pinterest?q=${query}`;
        const { data } = await axios.get(url, { timeout: 10000 });

        if (data.status && data.result && data.result.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.result.length);
          let imgUrl = data.result[randomIndex].images_url;

          if (!imgUrl) continue;

          const res = await axios.get(imgUrl, { responseType: "stream", timeout: 20000 });
          const writer = fs.createWriteStream(filePath);
          res.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });

          const stats = await fs.stat(filePath);
          if (stats.size > 5000) {
            success = true;
            break;
          }
        }
      } catch (e) {
        errorMsg = e.message;
        continue;
      }
    }

    try {
      if (!success) {
        throw new Error("Images download nahi ho payi. API fail ho rahi hai.");
      }

      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

      await message.reply({
        body: 
          `╭─────────────────────╮\n` +
          `     📸 𝐅𝐮𝐥𝐥 𝐇𝐨𝐭 𝐃𝐏 📸\n` +
          `╰─────────────────────╯\n\n` +
          `✨ Lijiye apki Full HD DP hazir hai!\n` +
          `💖 Ye lo apni profile mein lagao.\n\n` +
          `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
          `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━┛`,
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => fs.unlink(filePath).catch(() => {}), 5000);

    } catch (err) {
      console.error("[HotDP Error]", err.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      await fs.unlink(filePath).catch(() => {});
      
      return message.reply(`❌ Image laane mein masla aaya. Thodi der baad try karo.`);
    }
  }
};