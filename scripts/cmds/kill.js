const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

const TOKENS = [
  "6628568379|c1e620fa708a1d5696fb991c1bde5662",
  "350685531728|62f8ce9f74b12f84c123cc23437a4a32"
];
const BG = "https://i.imgur.com/B318OFJ.jpeg";
const DEFAULT_AVATAR = "https://i.imgur.com/7bQ4XGx.png";

async function fetchImage(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
    maxRedirects: 5,
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  if (res.data.byteLength < 1000) throw new Error("Image too small");
  return await loadImage(Buffer.from(res.data));
}

async function getAvatar(uid, usersData, api) {
  // 1) usersData.getAvatarUrl
  try {
    const url = await usersData.getAvatarUrl(uid);
    if (url) return await fetchImage(url);
  } catch (e) {}

  // 2) api.getUserInfo
  try {
    const info = await api.getUserInfo(uid);
    const url = info?.[uid]?.thumbSrc || info?.[uid]?.profileUrl;
    if (url) return await fetchImage(url);
  } catch (e) {}

  // 3) Graph API tokens
  for (const token of TOKENS) {
    try {
      return await fetchImage(`https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=${token}`);
    } catch (e) {}
  }

  // 4) Fallback
  return await fetchImage(DEFAULT_AVATAR);
}

module.exports = {
  config: {
    name: "kill",
    aliases: ["killed", "kidnap"],
    version: "2.4.0",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    description: { en: "Generate a kidnap-style image using two avatars" },
    category: "fun",
    guide: { en: "{pn} @mention | reply | <uid>" }
  },

  langs: {
    en: {
      noTarget: "❌ No target. Reply, @mention, or provide a UID.",
      success: "💀 %1 is killing %2",
      error: "❌ Error: %1",
      self: "❌ You can't target yourself."
    }
  },

  onStart: async function ({ api, event, message, usersData, getLang }) {
    const { senderID, messageID } = event;
    message.reaction("⏳", messageID);

    // Resolve target
    let targetID =
      event.messageReply?.senderID ||
      Object.keys(event.mentions || {})[0] ||
      (event.body?.match(/\b\d{8,20}\b/) || [])[0];

    if (!targetID) return message.reply(getLang("noTarget"));
    if (targetID == senderID) return message.reply(getLang("self"));

    // Names
    const [nameA, nameB] = await Promise.all([
      usersData.getName(senderID).catch(() => "You"),
      usersData.getName(targetID).catch(() => "Friend")
    ]);

    const tmpDir = path.join(__dirname, "tmp");
    fs.ensureDirSync(tmpDir);
    const outPath = path.join(tmpDir, `kill_${Date.now()}.png`);

    try {
      const [bg, avatarA, avatarB] = await Promise.all([
        fetchImage(BG),
        getAvatar(senderID, usersData, api),
        getAvatar(targetID, usersData, api)
      ]);

      const canvas = createCanvas(bg.width, bg.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bg, 0, 0);

      const drawCircle = (img, x, y, r) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
        ctx.restore();
      };

      drawCircle(avatarA, 150, 130, 30);
      drawCircle(avatarB, 360, 290, 30);

      fs.writeFileSync(outPath, canvas.toBuffer("image/png"));

      await message.reply({
        body: getLang("success", nameA, nameB),
        attachment: fs.createReadStream(outPath)
      });

      message.reaction("✅", messageID);

    } catch (err) {
      console.error("[kill]", err);
      message.reaction("❌", messageID);
      return message.reply(getLang("error", err.message));

    } finally {
      if (fs.existsSync(outPath)) {
        setTimeout(() => { try { fs.unlinkSync(outPath); } catch (e) {} }, 5000);
      }
    }
  }
};