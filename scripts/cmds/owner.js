const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports = {
  config: {
    name: "owner",
    aliases: ["info"],
    version: "1.6.0",
    author: "𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍",
    role: 0,
    shortDescription: "Owner information with image",
    category: "info",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ message }) {
    const ownerText = 
`╭─ 👑 Oᴡɴᴇʀ Iɴғᴏ 👑 ─╮
│ 👤 Nᴀᴍᴇ       : 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍
│ 🦋 Nɪᴄᴋ       : 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍
│ 🎂 Aɢᴇ        : 18
│ 💘 Rᴇʟᴀᴛɪᴏɴ   : STFU
│ 🎓 Pʀᴏғᴇssɪᴏɴ : 𝐉𝐎𝐁
│ 📚 Eᴅᴜᴄᴀᴛɪᴏɴ  : 𝐆𝐎𝐕𝐄𝐓 𝐒𝐂𝐇𝐎𝐎𝐋
│ 🏡 LᴏᴄᴀᴛɪᴏN   : 𝐋𝐀𝐇𝐎𝐑𝐄, 𝐏𝐀𝐊𝐈𝐒𝐓𝐀𝐍
├─ 🔗 Cᴏɴᴛᴀᴄᴛ ─╮
│ 📘 Facebook  : id=100075933317520
│ 💬 Messenger : id=100075933317520
│ 📞 WhatsApp  : +923474771404
╰────────────────╯`;

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const imgPath = path.join(cacheDir, `owner_${Date.now()}.jpg`);
    const imgLink = "https://i.imgur.com/1tUVG85.jpeg";

    try {
      // Direct Buffer download (No stream issues)
      const res = await axios.get(imgLink, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 100.0; Win64; x64)"
        }
      });

      // Write image to cache file synchronously
      fs.writeFileSync(imgPath, Buffer.from(res.data, "binary"));

      // Send message with image stream
      await message.reply({
        body: ownerText,
        attachment: fs.createReadStream(imgPath)
      });

    } catch (error) {
      console.error("Owner Image Error:", error.message || error);
      // Fallback: Agar image na mil paaye toh sirf text bhejo
      return message.reply(ownerText);
    } finally {
      // Auto cleanup after sending
      setTimeout(() => {
        if (fs.existsSync(imgPath)) {
          try { fs.unlinkSync(imgPath); } catch (e) {}
        }
      }, 5000);
    }
  }
};
