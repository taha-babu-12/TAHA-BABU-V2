const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "ytv",
    aliases: ["ytdl", "video", "singv"],
    version: "2.1.0",
    author: "Taha Khan",
    countDown: 5,
    role: 0,
    description: {
      en: "Search YouTube videos, reply with number to download MP4",
      ur: "YouTube video search karein aur number reply karke MP4 download karein"
    },
    category: "media",
    guide: {
      en: "{pn} [song name]",
      ur: "{pn} [gaane ka naam]"
    }
  },

  async onStart({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");

    if (!query) {
      return api.sendMessage(
        "❌ **Aapne gaane ka naam nahi likha!**\n\n💡 *Example:* `.ytv Waja tum`",
        threadID,
        messageID
      );
    }

    if (api.setMessageReaction) api.setMessageReaction("⌛", messageID, () => {}, true);

    try {
      // STEP 1: Search YouTube Videos via Nexray Search API
      const searchRes = await axios.get(`https://api.nexray.eu.cc/search/youtube?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        timeout: 15000
      });

      const results = searchRes.data?.result;

      if (!results || !Array.isArray(results) || results.length === 0) {
        if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ Is naam se koi video nahi mili!", threadID, messageID);
      }

      const topResults = results.slice(0, 5);
      const numBadges = ["❶", "❷", "❸", "❹", "❺"];

      // Bold & Mota Stylized Search Box
      let msg = `╭━━━〔 𝗬𝗢𝗨𝗧𝗨𝗕𝗘 𝗦𝗘𝗔𝗥𝗖𝗛 〕━━━╮\n\n`;

      topResults.forEach((item, index) => {
        msg += `${numBadges[index]} 𝗧𝗶𝘁𝗹𝗲: ${item.title}\n` +
               `⏱️ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: ${item.duration}  |  📺 𝗖𝗵𝗮𝗻𝗻𝗲𝗹: ${item.channel}\n` +
               `───────────────────────\n`;
      });

      msg += `\n👉 𝗝𝗶𝘀 𝘃𝗶𝗱𝗲𝗼 𝗸𝗼 𝗱𝗼𝘄𝗻𝗹𝗼𝗮𝗱 𝗸𝗮𝗿𝗻𝗮 𝗵𝗮𝗶, 𝘂𝘀 𝗸𝗮 𝗻𝘂𝗺𝗯𝗲𝗿 𝗿𝗲𝗽𝗹𝘆 𝗸𝗮𝗿𝗲𝗶𝗻 (𝟭-𝟱)\n\n` +
             `👑 𝗢𝗪𝗡𝗘𝗥: 𝗧𝗔𝗛𝗔 𝗞𝗛𝗔𝗡\n` +
             `╰━━━━━━━━━━━━━━━━━━━━━╯`;

      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

      const sendMsg = await api.sendMessage(msg, threadID, messageID);

      global.GoatBot.onReply.set(sendMsg.messageID, {
        commandName: this.config.name,
        messageID: sendMsg.messageID,
        author: senderID,
        results: topResults
      });

    } catch (err) {
      console.error("[YTV SEARCH ERROR]:", err.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ YouTube search karne me masla aaya!", threadID, messageID);
    }
  },

  async onReply({ api, event, Reply }) {
    const { threadID, messageID, senderID, body } = event;
    const { author, results } = Reply;

    if (senderID !== author) {
      return api.sendMessage("⚠️ Yeh search list aap ke liye nahi hai!", threadID, messageID);
    }

    const choice = parseInt(body.trim());

    if (isNaN(choice) || choice < 1 || choice > results.length) {
      return api.sendMessage(`❌ Baraye meherbani 1 se ${results.length} ke darmiyan number reply karein!`, threadID, messageID);
    }

    const selectedVideo = results[choice - 1];
    const videoUrl = selectedVideo.url;

    global.GoatBot.onReply.delete(Reply.messageID);

    if (api.setMessageReaction) api.setMessageReaction("⌛", messageID, () => {}, true);

    const downloadingMsg = await api.sendMessage(
      `📥 **"${selectedVideo.title}"** download ho rahi hai...\n⏳ Baraye meherbani thoda intezar karein!`,
      threadID,
      messageID
    );

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `ytv_${Date.now()}.mp4`);

    try {
      // STEP 2: Get MP4 Download Link via Nexray Downloader API
      const dlRes = await axios.get(`https://api.nexray.eu.cc/downloader/v1/ytmp4?url=${encodeURIComponent(videoUrl)}&resolusi=1080`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        timeout: 30000
      });

      const mp4Url = dlRes.data?.result?.url;
      const title = dlRes.data?.result?.title || selectedVideo.title;
      const authorName = dlRes.data?.result?.author || selectedVideo.channel;
      const quality = dlRes.data?.result?.quality || "1080p";

      if (!mp4Url) {
        if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ Video download link extract nahi ho saka!", threadID, messageID);
      }

      // STEP 3: Download Video Stream to Cache
      const streamRes = await axios({
        method: "get",
        url: mp4Url,
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      const writer = fs.createWriteStream(filePath);
      streamRes.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

      if (downloadingMsg && downloadingMsg.messageID) {
        api.unsendMessage(downloadingMsg.messageID);
      }

      // STEP 4: Send MP4 Video Attachment with Bold Layout
      const finalMsg = `╭━━━〔 𝗬𝗢𝗨𝗧𝗨𝗕𝗘 𝗩𝗜𝗗𝗘𝗢 〕━━━╮\n` +
                       `📝 𝗧𝗶𝘁𝗹𝗲: ${title}\n` +
                       `👤 𝗖𝗵𝗮𝗻𝗻𝗲𝗹: ${authorName}\n` +
                       `⚙️ 𝗤𝘂𝗮𝗹𝗶𝘁𝘆: ${quality}\n` +
                       `👑 𝗢𝗪𝗡𝗘𝗥: 𝗧𝗔𝗛𝗔 𝗞𝗛𝗔𝗡\n` +
                       `╰━━━━━━━━━━━━━━━━━━━━━╯`;

      await api.sendMessage(
        {
          body: finalMsg,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        messageID
      );

      if (fs.existsSync(filePath)) await fs.unlink(filePath);

    } catch (err) {
      console.error("[YTV DOWNLOAD ERROR]:", err.message);
      if (fs.existsSync(filePath)) await fs.unlink(filePath);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ Video download ya send karne me masla aaya! File size zayada hone ki wajah se error aa sakta hai.", threadID, messageID);
    }
  }
};
