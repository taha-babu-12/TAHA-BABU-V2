const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin", "pindl", "dpz"],
    version: "2.3.0",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    description: "Search and download images from Pinterest using Nexray API",
    category: "media",
    guide: {
      en: "{pn} <query> -<count>\nExample: {pn} cute girl -10"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    let input = args.join(" ").trim();

    if (!input) {
      return message.reply("⚠️ Baraye meharbani query dein!\nExample: /pinterest cute girl -10");
    }

    // Extract count if provided with minus sign (e.g. -10, -15, etc.)
    let count = 5; // Default count agar user na likhe
    const countMatch = input.match(/-\d+$/);
    if (countMatch) {
      count = parseInt(countMatch[0].replace("-", ""));
      input = input.replace(/-\d+$/, "").trim();
      if (count > 20) count = 20; // Safe max limit for Facebook attachments
      if (count < 1) count = 1;
    }

    const searchingMsg = await message.reply(`📌 Searching Pinterest for "${input}" (${count} images)... Please wait!`);

    try {
      const apiUrl = `https://api.nexray.eu.cc/search/pinterest?q=${encodeURIComponent(input)}`;
      const response = await axios.get(apiUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' 
        },
        timeout: 25000
      });

      const resData = response.data;
      const results = resData?.result || resData?.data || resData?.results || [];

      if (!Array.isArray(results) || results.length === 0) {
        if (searchingMsg?.messageID) try { api.unsendMessage(searchingMsg.messageID); } catch (e) {}
        return message.reply(`❌ "${input}" ke liye koi Pinterest images nahi mili!`);
      }

      // Slicing results exactly according to user requested count
      const items = results.slice(0, count);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      const attachments = [];
      const tempPaths = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const imageUrl = item.images_url || item.url || item.image || item.link;

        if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith("http")) continue;

        const filePath = path.join(cacheDir, `${Date.now()}_pin_${i}.jpg`);

        try {
          const imgRes = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Referer': 'https://www.pinterest.com/'
            },
            timeout: 12000
          });

          fs.writeFileSync(filePath, Buffer.from(imgRes.data));
          attachments.push(fs.createReadStream(filePath));
          tempPaths.push(filePath);
        } catch (err) {
          console.error(`Error downloading image ${i}:`, err.message);
        }
      }

      if (searchingMsg?.messageID) {
        try { api.unsendMessage(searchingMsg.messageID); } catch (e) {}
      }

      if (attachments.length === 0) {
        return message.reply("❌ Images download karne mein error aaya! Kripya dobara try karein.");
      }

      await message.reply({
        body: `╭─── « 📌 PINTEREST SEARCH 📌 » ───⟡\n│\n` +
              `│ 🔍 Query: "${input}"\n` +
              `│ 🖼️ Images Sent: ${attachments.length}\n` +
              `│ ✨ Developed by TAHA KHAN ✨\n` +
              `╰─────────────────────────────⟡`,
        attachment: attachments
      });

      // Cleanup cache files after sending
      setTimeout(() => {
        tempPaths.forEach(p => {
          try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
        });
      }, 15000);

    } catch (error) {
      console.error("Pinterest Nexray Command Error:", error.message);
      if (searchingMsg?.messageID) {
        try { api.unsendMessage(searchingMsg.messageID); } catch (e) {}
      }
      return message.reply(`❌ Search failed: ${error.message}`);
    }
  }
};
          
