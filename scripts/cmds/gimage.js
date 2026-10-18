const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "gimage",
    version: "1.0.0",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    description: {
      en: "Search and download Google images",
      ur: "Google se tasaveer talash kar ke bhejta hai"
    },
    category: "image",
    guide: {
      en: "{p}gimage <search query>",
      ur: "{p}gimage <jis cheez ki pic chahiye wo likhein>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const query = args.join(" ");

    if (!query) {
      return api.sendMessage("❌ Koye naam ya word likhein jis ki image talash karni hai!\n\nUsage: .gimage car", event.threadID, event.messageID);
    }

    const waitMsg = await api.sendMessage("🔍 Google Image search ki ja rahi hai...", event.threadID);

    try {
      // API Call to Google Image endpoint
      const apiUrl = `https://xalman-apis.vercel.app/api/google-image?prompt=${encodeURIComponent(query)}`;
      const res = await axios.get(apiUrl);

      // Checking response data (array or image url)
      let imageUrls = [];
      if (Array.isArray(res.data)) {
        imageUrls = res.data;
      } else if (res.data.result && Array.isArray(res.data.result)) {
        imageUrls = res.data.result;
      } else if (res.data.url) {
        imageUrls = [res.data.url];
      } else if (typeof res.data === "string" && res.data.startsWith("http")) {
        imageUrls = [res.data];
      }

      if (!imageUrls || imageUrls.length === 0) {
        api.unsendMessage(waitMsg.messageID);
        return api.sendMessage("❌ Is query par koi tasveer nahi mili.", event.threadID, event.messageID);
      }

      // Max 5 images stream prepare karna
      const attachments = [];
      const cacheFiles = [];
      const maxCount = Math.min(imageUrls.length, 5);

      for (let i = 0; i < maxCount; i++) {
        const imgUrl = typeof imageUrls[i] === "object" ? imageUrls[i].url || imageUrls[i].image : imageUrls[i];
        if (!imgUrl) continue;

        const imgRes = await axios.get(imgUrl, { responseType: "arraybuffer" });
        const filePath = path.join(__dirname, "cache", `gimage_${Date.now()}_${i}.png`);
        
        await fs.outputFile(filePath, Buffer.from(imgRes.data));
        cacheFiles.push(filePath);
        attachments.push(fs.createReadStream(filePath));
      }

      // Send Images
      await api.sendMessage(
        {
          body: `🖼️ **Google Image Search**\n🔍 **Query:** ${query}\n\n»» 𝐎𝐖𝐍𝐄𝐑: 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ««`,
          attachment: attachments
        },
        event.threadID,
        () => {
          // Cleanup cache files after sending
          cacheFiles.forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
          });
        },
        event.messageID
      );

      api.unsendMessage(waitMsg.messageID);

    } catch (error) {
      console.error("[GIMAGE ERROR]:", error.message);
      if (waitMsg && waitMsg.messageID) api.unsendMessage(waitMsg.messageID);
      return api.sendMessage("❌ Tasveer talash karne mein masla aaya hai. Koshish karein ke dobara try karein.", event.threadID, event.messageID);
    }
  }
};
