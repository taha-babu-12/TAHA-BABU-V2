const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "editor",
    aliases: ["edt", "editimg"],
    version: "1.0.0",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    category: "ai",
    description: { en: "Edit images using API", ur: "API se image edit karo" },
    guide: { en: "{pn} <prompt/effect> (reply to a photo)", ur: "{pn} <kya karna hai> (photo reply karo)" }
  },

  async onStart({ api, event, args, message }) {
    const { threadID, messageID, senderID, messageReply } = event;
    const prompt = args.join(" ").trim();

    // 1. Check karo ke koi photo reply ki gayi hai ya nahi
    let imageUrl = null;
    if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
      if (messageReply.attachments[0].type === "photo" || messageReply.attachments[0].type === "image") {
        imageUrl = messageReply.attachments[0].url;
      }
    }

    if (!imageUrl) {
      return message.reply(
        `╭─────────────────────╮\n` +
        `     📸 𝐄𝐝𝐢𝐭𝐨𝐫 𝐀𝐈 📸\n` +
        `╰─────────────────────╯\n\n` +
        `📌 Kisi photo ko reply karke likho:\n` +
        `» editor anime\n` +
        `» editor remove background\n` +
        `» editor make it 3d\n\n` +
        `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
        `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━┛`
      );
    }

    if (!prompt) {
      return message.reply("❌ Kuch likho toh sahi ke photo ke sath kya karna hai! (Misaal: `editor anime`)");
    }

    api.setMessageReaction("🎨", messageID, () => {}, true);
    
    await message.reply(
      `╭─────────────────────╮\n` +
      `     🎨 𝐄𝐝𝐢𝐭𝐢𝐧𝐠 🎨\n` +
      `╰─────────────────────╯\n\n` +
      `🎯 Prompt : ${prompt}\n` +
      `⏳ Please wait...`
    );

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `edit_${senderID}_${Date.now()}.jpg`);

    try {
      // 2. API Call (Azadx Editor)
      // Hum prompt aur image url query mein bhej rahe hain
      const apiUrl = `https://azadx69x.is-a.dev/api/editor?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;
      
      const res = await axios.get(apiUrl, { timeout: 60000 });

      // 3. API response se image URL nikaalo
      let resultUrl = null;
      if (res.data) {
         if (res.data.result) resultUrl = res.data.result;
         else if (res.data.data) resultUrl = res.data.data;
         else if (res.data.url) resultUrl = res.data.url;
         else if (res.data.image) resultUrl = res.data.image;
         else if (typeof res.data === "string" && res.data.startsWith("http")) resultUrl = res.data;
      }

      if (!resultUrl) throw new Error("API se valid image URL nahi mila.");

      // 4. Edited Image Download karo
      const imgRes = await axios({ 
        url: resultUrl, 
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

      // 5. Send Edited Image (Stylish)
      await message.reply({
        body: 
          `╭─────────────────────╮\n` +
          `     ✨ 𝐄𝐝𝐢𝐭 𝐒𝐮𝐜𝐜𝐞𝐬𝐬 ✨\n` +
          `╰─────────────────────╯\n\n` +
          `🎯 Prompt : ${prompt}\n\n` +
          `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
          `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━┛`,
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => fs.unlink(filePath).catch(() => {}), 5000);

    } catch (err) {
      console.error("[Editor Error]", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      
      let errMsg = err.message;
      if (err.response && err.response.data) {
         errMsg = JSON.stringify(err.response.data);
      }

      return message.reply(
        `╭─────────────────────╮\n` +
        `     ❌ 𝐄𝐫𝐫𝐨𝐫 ❌\n` +
        `╰─────────────────────╯\n\n` +
        `📌 Wajah : ${errMsg}\n\n` +
        `👉 Thodi der baad try karo ya doosra prompt likho.`
      );
    }
  }
};
