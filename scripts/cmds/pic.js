const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
  config: {
    name: "pic",
    aliases: ["mentionpic", "frame", "dp"],
    version: "1.0.8",
    author: "Bot",
    countDown: 5,
    role: 0,
    description: {
      en: "Create customized image template with clean red bold user name",
      ur: "Red font ke sath clean aur stylish photo edit karein"
    },
    category: "image",
    guide: {
      en: "{pn} [@mention / reply]",
      ur: "{pn} [@mention / reply]"
    }
  },

  TEMPLATE_URL: "https://i.ibb.co/jvgBPgm2/19ca15e7654d.jpg",

  async onStart({ api, event, args }) {
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;

    if (api.setMessageReaction) api.setMessageReaction("⌛", messageID, () => {}, true);

    let targetID;
    let targetName = "";

    // Mention, Reply ya Self ID check
    if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
      targetName = mentions[targetID].replace(/@/g, "").trim();
    } else if (type === "message_reply") {
      targetID = messageReply.senderID;
    } else {
      targetID = senderID;
    }

    // Name fetch logic if not mentioned directly
    if (!targetName) {
      try {
        const userInfo = await api.getUserInfo(targetID);
        targetName = userInfo[targetID]?.name || "User";
      } catch (e) {
        targetName = "User";
      }
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const outputPath = path.join(cacheDir, `pic_${targetID}_${Date.now()}.png`);

    try {
      // Background Template Load
      const bgImage = await loadImage(this.TEMPLATE_URL);
      const canvas = createCanvas(bgImage.width, bgImage.height);
      const ctx = canvas.getContext("2d");

      // Draw Original Background
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

      // Position logic: Upper Center
      const centerX = canvas.width / 2;
      const topY = canvas.height * 0.22;

      // Font Size: Bara Bold Font
      const fontSize = Math.floor(canvas.width * 0.085);
      ctx.font = `900 ${fontSize}px "Impact", "Arial Black", sans-serif`;
      ctx.textAlign = "center";

      const formattedName = targetName.toUpperCase();

      // Soft Shadow for Clean Readability
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 4;

      // Red Gradient Fill (Bright Red to Deep Red)
      const gradient = ctx.createLinearGradient(0, topY - fontSize, 0, topY);
      gradient.addColorStop(0, "#FF3333"); // Bright Red
      gradient.addColorStop(0.6, "#E60000"); // Standard Red
      gradient.addColorStop(1, "#990000"); // Deep Red

      ctx.fillStyle = gradient;
      ctx.fillText(formattedName, centerX, topY);

      // Save to PNG File
      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(outputPath, buffer);

      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

      // Clean Caption
      await api.sendMessage(
        {
          body: `🔴 𝐍𝐀𝐌𝐄 𝐀𝐑𝐓 🔴\n\n👤 𝐍𝐚𝐦𝐞:  pic banana k style ${targetName}`,
          attachment: fs.createReadStream(outputPath)
        },
        threadID,
        messageID
      );

      if (fs.existsSync(outputPath)) await fs.unlink(outputPath);

    } catch (err) {
      console.error("[PIC CMD ERROR]:", err);
      if (fs.existsSync(outputPath)) await fs.unlink(outputPath);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "❌ Picture edit karne me error aaya!",
        threadID,
        messageID
      );
    }
  }
};
