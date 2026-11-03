const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "album",
    aliases: ["randomvideo", "rv"],
    version: "1.1.0",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    category: "media",
    description: { en: "Random video from 19 categories", ur: "19 categories se random video" },
    guide: { en: "{pn} <category>\n{pn} -list", ur: "{pn} <category>" }
  },

  API_URL: "https://video-album-api.vercel.app/category",

  async onStart({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;
    const input = args.join(" ").toLowerCase().trim();

    // 🎨 Stylish List
    if (input === "-list" || input === "list") {
      return message.reply(
        `╭─────────────────────╮\n` +
        `     🎬 𝐀𝐥𝐛𝐮𝐦 𝐋𝐢𝐬𝐭 🎬\n` +
        `╰─────────────────────╯\n\n` +
        `🎯 𝐀𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐂𝐚𝐭𝐞𝐠𝐨𝐫𝐢𝐞𝐬:\n\n` +
        `🪄 funny      🥀 sad\n` +
        `😎 attitude   🌸 anime\n` +
        `💞 romantic   🔥 hot\n` +
        `👶 baby       🕌 islamic\n` +
        `❤️ love       💋 kissing\n` +
        `🐱 cat        🎸 bangla_band\n` +
        `🎨 cartoon    🌺 flower\n` +
        `🎮 freefire   ⚽ football\n` +
        `🏍️ bike_car   💑 couple_video\n` +
        `✨ aesthetic\n\n` +
        `👉 Misaal : album funny\n\n` +
        `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
        `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━┛`
      );
    }

    if (!input) {
      return message.reply(
        `╭─────────────────────╮\n` +
        `     📌 𝐀𝐥𝐛𝐮𝐦 𝐁𝐨𝐭 📌\n` +
        `╰─────────────────────╯\n\n` +
        `🔍 Please provide a category.\n\n` +
        `✨ Misaal :\n` +
        `» album funny\n` +
        `» album anime\n\n` +
        `📜 Saari categories dekhne ke liye: album -list\n\n` +
        `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
        `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━┛`
      );
    }

    api.setMessageReaction("⌛", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `album_${senderID}_${Date.now()}.mp4`);

    try {
      // 1. API Call
      const res = await axios.get(`${this.API_URL}?name=${encodeURIComponent(input)}`, { timeout: 20000 });
      
      if (!res.data || !res.data.status || !res.data.data) {
        throw new Error("Is category mein koi video nahi mili.");
      }

      const videoUrl = res.data.data;

      // 2. Video Download karo
      const videoRes = await axios({ 
        url: videoUrl, 
        method: "GET", 
        responseType: "stream", 
        timeout: 60000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const writer = fs.createWriteStream(filePath);
      videoRes.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // 3. Size Check
      const stats = await fs.stat(filePath);
      if (stats.size > 25 * 1024 * 1024) {
        await fs.unlink(filePath).catch(() => {});
        throw new Error("Video 25MB se bari hai (Facebook limit).");
      }

      api.setMessageReaction("✅", messageID, () => {}, true);

      // 4. Stylish Video Send
      await message.reply({
        body: 
          `╭─────────────────────╮\n` +
          `     🎬 𝐑𝐚𝐧𝐝𝐨𝐦 𝐕𝐢𝐝𝐞𝐨 🎬\n` +
          `╰─────────────────────╯\n\n` +
          `🎯 Category : ${input.toUpperCase()}\n\n` +
          `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
          `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━┛`,
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => fs.unlink(filePath).catch(() => {}), 5000);

    } catch (err) {
      console.error("[Album Error]", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      
      return message.reply(
        `╭─────────────────────╮\n` +
        `     ❌ 𝐅𝐚𝐢𝐥𝐞𝐝 ❌\n` +
        `╰─────────────────────╯\n\n` +
        `📌 Wajah : ${err.message}\n\n` +
        `👉 album -list se sahi category chuno.`
      );
    }
  }
};
