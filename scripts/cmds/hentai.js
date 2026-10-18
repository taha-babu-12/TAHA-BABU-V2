const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "hentai",
    aliases: [],
    version: "1.0.0",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    shortDescription: "Send safe cute anime illustration",
    longDescription: "Fetches safe anime artwork from Lolicon API",
    category: "fun",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID } = event;

    const setReaction = (emoji) => {
      try { api.setMessageReaction(emoji, messageID, () => {}, true); } catch (e) {}
    };

    setReaction("⏳");

    try {
      // Lolicon API request with non-R18 filter
      const res = await axios.post("https://api.lolicon.app/setu/v2", {
        r18: 0,
        num: 1
      }, {
        timeout: 20000
      });

      if (!res.data || !res.data.data || res.data.data.length === 0) {
        setReaction("❌");
        return api.sendMessage("❌ | Koi image nahi mili, kripya dobara try karein.", threadID, messageID);
      }

      const item = res.data.data[0];
      const imageUrl = item.urls.regular || item.urls.original;

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const filePath = path.join(cacheDir, `${Date.now()}_hentai.jpg`);

      const imgRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 30000
      });

      await fs.writeFile(filePath, Buffer.from(imgRes.data));

      setReaction("✨");

      const caption = 
        `✨ 𝗔𝗡𝗜𝗠𝗘 𝗜𝗟𝗟𝗨𝗦𝗧𝗥𝗔𝗧𝗜𝗢𝗡 ✨\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🎨 Title: ${item.title || "N/A"}\n` +
        `👤 Author: ${item.author || "N/A"}\n` +
        `✨ Powered by TAHA KHAN ✨`;

      await api.sendMessage(
        {
          body: caption,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        () => {
          setTimeout(() => {
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
          }, 10000);
        },
        messageID
      );

    } catch (err) {
      console.error("Hentai Command Error:", err.message);
      setReaction("❌");
      api.sendMessage("🚫 | Image download karne mein issue aaya. Kripya thodi der baad try karein.", threadID, messageID);
    }
  }
};
