const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "fluxai",
    aliases: ["flux3"], // Alias laga diya taake flux se bhi chale
    version: "7.0.2",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    category: "ai",
    description: { en: "Generate AI Images using Flux AI", ur: "Flux AI se Image banao" },
    guide: { en: "{pn} <prompt>", ur: "{pn} <kya banana hai>" }
  },

  async onStart({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;
    const prompt = args.join(" ").trim();

    if (!prompt) {
      return message.reply(
        `╭─────────────────────╮\n` +
        `     🎨 𝐅𝐥𝐮𝐱 𝐀𝐈 🎨\n` +
        `╰─────────────────────╯\n\n` +
        `🔍 Please provide a prompt.\n\n` +
        `✨ Misaal :\n` +
        `» fluxai a cute cat\n` +
        `» fluxai cyberpunk city\n\n` +
        `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
        `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━┛`
      );
    }

    api.setMessageReaction("🎨", messageID, () => {}, true);
    
    await message.reply(
      `╭─────────────────────╮\n` +
      `     ⏳ 𝐆𝐞𝐧𝐞𝐫𝐚𝐭𝐢𝐧𝐠 ⏳\n` +
      `╰─────────────────────╯\n\n` +
      `🎯 Prompt : ${prompt}\n` +
      `⏳ Please wait (10-20 sec)...`
    );

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `fluxai_${senderID}_${Date.now()}.jpg`);

    try {
      // 1. API Call (Azadx Flux)
      const apiUrl = `https://azadx69x.is-a.dev/api/flux?prompt=${encodeURIComponent(prompt)}`;
      const res = await axios.get(apiUrl, { timeout: 60000 });

      // 2. Response se Image URL nikaalo
      let imgUrl = null;
      if (res.data) {
         if (res.data.result) imgUrl = res.data.result;
         else if (res.data.data) imgUrl = res.data.data;
         else if (res.data.url) imgUrl = res.data.url;
         else if (res.data.image) imgUrl = res.data.image;
         else if (typeof res.data === "string" && res.data.startsWith("http")) imgUrl = res.data;
      }

      if (!imgUrl) throw new Error("API se valid image URL nahi mila.");

      // 3. Image Download karo
      const imgRes = await axios({ 
        url: imgUrl, 
        method: "GET", 
        responseType: "stream", 
        timeout: 60000 
      });

      const writer = fs.createWriteStream(filePath);
      imgRes.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      api.setMessageReaction("✅", messageID, () => {}, true);

      // 4. Send Image with Stylish Caption
      await message.reply({
        body: 
          `╭─────────────────────╮\n` +
          `     ✨ 𝐅𝐥𝐮𝐱 𝐀𝐈 ✨\n` +
          `╰─────────────────────╯\n\n` +
          `🎯 Prompt : ${prompt}\n\n` +
          `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
          `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━┛`,
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => fs.unlink(filePath).catch(() => {}), 5000);

    } catch (err) {
      console.error("[FluxAI Error]", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      
      let errMsg = err.message;
      if (err.response && err.response.data) {
         errMsg = JSON.stringify(err.response.data);
      }

      return message.reply(
        `╭─────────────────────╮\n` +
        `     ❌ 𝐅𝐚𝐢𝐥𝐞𝐝 ❌\n` +
        `╰─────────────────────╯\n\n` +
        `📌 Wajah : ${errMsg}\n\n` +
        `👉 Koi aur prompt try karo ya thodi der baad try karo.`
      );
    }
  }
};
