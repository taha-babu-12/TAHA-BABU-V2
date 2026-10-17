const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "textpro",
    aliases: ["logo", "maker"],
    version: "3.0.0",
    author: "Taha Khan",
    countDown: 5,
    role: 0,
    description: {
      en: "Generate multiple TextPro & Logo designs including dual-text logos",
      ur: "Aik hi command se mukhtalif TextPro logos banayein"
    },
    category: "graphics",
    guide: {
      en: "{pn} [style] [text] OR {pn} painting [text1] | [text2]",
      ur: "{pn} [style] [text] Ya {pn} painting [text1] | [text2]"
    }
  },

  async onStart({ api, event, args }) {
    const { threadID, messageID } = event;

    // Tamam APIs yahan configure ki gayi hain (type: 1 means single text, type: 2 means double text)
    const apiMap = {
      "blackpink": { url: "https://api.nexray.eu.cc/textpro/blackpink", type: 1 },
      "neon": { url: "https://api.nexray.eu.cc/textpro/neon", type: 1 },
      "matrix": { url: "https://api.nexray.eu.cc/textpro/matrix", type: 1 },
      "glitch": { url: "https://api.nexray.eu.cc/textpro/glitch", type: 1 },
      "blood": { url: "https://api.nexray.eu.cc/textpro/blood", type: 1 },
      "thunder": { url: "https://api.nexray.eu.cc/textpro/thunder", type: 1 },
      "transformer": { url: "https://api.nexray.eu.cc/textpro/transformer", type: 1 },
      "luxury": { url: "https://api.nexray.eu.cc/textpro/luxury", type: 1 },
      "metallic": { url: "https://api.nexray.eu.cc/textpro/metallic", type: 1 },
      "devil": { url: "https://api.nexray.eu.cc/textpro/devil", type: 1 },
      "cartoon": { url: "https://api.nexray.eu.cc/textpro/cartoon-graffiti", type: 1 },
      "foggy": { url: "https://api.nexray.eu.cc/textpro/foggy-glass", type: 1 },
      "devilwings": { url: "https://api.nexray.eu.cc/textpro/devil-wings", type: 1 },
      "painting": { url: "https://api.nexray.eu.cc/textpro/painting", type: 2 }
    };

    const stylesList = Object.keys(apiMap);

    if (args.length === 0) {
      return api.sendMessage(
        `❌ **Aapne style ya text nahi likha!**\n\n` +
        `💡 *Istemaal ka tarika:*\n` +
        `• \`.textpro cartoon Taha\`\n` +
        `• \`.textpro foggy Taha Khan\`\n` +
        `• \`.textpro painting King | Taha\`  *(2 words k liye | lagayein)*\n\n` +
        `🎨 **Mawjooda Styles (${stylesList.length}):**\n` +
        `\`${stylesList.join(", ")}\``,
        threadID,
        messageID
      );
    }

    const selectedStyle = args[0].toLowerCase();

    // Check if style exists in the list
    if (!apiMap[selectedStyle]) {
      return api.sendMessage(
        `❌ **Yeh style list me nahi hai!**\n\n` +
        `🎨 **Sahi Styles:**\n\`${stylesList.join(", ")}\``,
        threadID,
        messageID
      );
    }

    const textInput = args.slice(1).join(" ");

    if (!textInput) {
      return api.sendMessage(`❌ Baraye meherbani **${selectedStyle.toUpperCase()}** ke liye text bhi likhein!`, threadID, messageID);
    }

    if (api.setMessageReaction) api.setMessageReaction("⌛", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `logo_${Date.now()}.png`);

    try {
      let targetApiUrl = "";
      const apiConfig = apiMap[selectedStyle];

      // Logic for Double Text APIs (like Painting)
      if (apiConfig.type === 2) {
        let t1 = "Love"; // Default text 1
        let t2 = textInput; // Default text 2

        // If user used | symbol, separate the words
        if (textInput.includes("|")) {
          const parts = textInput.split("|");
          t1 = parts[0].trim();
          t2 = parts[1].trim();
        }
        targetApiUrl = `${apiConfig.url}?text1=${encodeURIComponent(t1)}&text2=${encodeURIComponent(t2)}`;
      } 
      // Logic for Single Text APIs
      else {
        targetApiUrl = `${apiConfig.url}?text=${encodeURIComponent(textInput)}`;
      }

      const res = await axios.get(targetApiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        timeout: 25000
      });

      const imageUrl = res.data?.result || res.data?.url || res.data?.data || (typeof res.data === "string" ? res.data : null);

      if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
        if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ Logo API se generate nahi ho saka! Server masla ho sakta hai.", threadID, messageID);
      }

      // Download Generated Image
      const imgRes = await axios({
        method: "get",
        url: imageUrl,
        responseType: "stream"
      });

      const writer = fs.createWriteStream(filePath);
      imgRes.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

      const msg = `╭━━━〔 𝗟𝗢𝗚𝗢 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥 〕━━━╮\n` +
                  `🎨 𝗦𝘁𝘆𝗹𝗲: ${selectedStyle.toUpperCase()}\n` +
                  `📝 𝗧𝗲𝗭𝘁: ${textInput.replace("|", "-")}\n` +
                  `👑 𝗢𝗪𝗡𝗘𝗥: 𝗧𝗔𝗛𝗔 𝗞𝗛𝗔𝗡\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━╯`;

      await api.sendMessage(
        {
          body: msg,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        messageID
      );

      if (fs.existsSync(filePath)) await fs.unlink(filePath);

    } catch (err) {
      console.error("[LOGO GENERATOR ERROR]:", err.message);
      if (fs.existsSync(filePath)) await fs.unlink(filePath);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ Logo generate karne me error aaya! API down ho sakti hai.", threadID, messageID);
    }
  }
};
