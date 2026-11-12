const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "sing",
    aliases: ["song", "play"],
    version: "2.0.0",
    author: "Taha Khan",
    countDown: 5,
    role: 0,
    description: {
      en: "Search Apple Music and download the song audio",
      ur: "Apple Music se gaana search karke download karein"
    },
    category: "media",
    guide: {
      en: "{pn} [song name]",
      ur: "{pn} [gaane ka naam]"
    }
  },

  API_YT: "https://yt-mian-amir.vercel.app/api/link",
  MAX_SIZE: 25 * 1024 * 1024, // 25MB Facebook limit

  async onStart({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");

    if (!query) {
      return api.sendMessage(
        `╭─────────────────────╮\n` +
        `     🎵 𝐒𝐢𝐧𝐠 𝐁𝐨𝐭 🎵\n` +
        `╰─────────────────────╯\n\n` +
        `📌 Bhai, gaane ka naam likho!\n` +
        `✨ Misaal: \`sing Waja Tum Ho\`\n\n` +
        `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
        `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━┛`,
        threadID,
        messageID
      );
    }

    if (api.setMessageReaction) api.setMessageReaction("⌛", messageID, () => {}, true);
    await api.sendMessage(`🔎 Bhai, "${query}" dhoondh raha hoon...`, threadID, messageID);

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const imagePath = path.join(cacheDir, `sing_img_${Date.now()}.jpg`);
    const audioPath = path.join(cacheDir, `sing_audio_${Date.now()}.mp3`);

    try {
      // 1. Apple Music Search (Title aur Cover ke liye)
      let songTitle = query;
      let artistName = "Unknown";
      let appleMusicImage = null;

      try {
        const res = await axios.get(`https://api.nexray.eu.cc/search/applemusic?q=${encodeURIComponent(query)}`, { timeout: 10000 });
        if (res.data?.result?.length > 0) {
          const topResult = res.data.result[0];
          songTitle = topResult.title;
          artistName = topResult.subtitle;
          if (topResult.image) {
            appleMusicImage = topResult.image.replace("110x110bb-60.jpg", "600x600bb.jpg");
          }
        }
      } catch (e) {
        console.log("[Sing] Apple Music API fail, using YouTube search only.");
      }

      // 2. YouTube par search karo (Audio ke liye)
      const ytSearchQuery = `${songTitle} ${artistName}`;
      const search = await yts(ytSearchQuery);
      if (!search.videos || !search.videos[0]) throw new Error("YouTube par gaana nahi mila.");
      
      const video = search.videos[0];

      // 3. YouTube Audio API se MP3 link lo
      const ytApiUrl = `${this.API_YT}?url=${encodeURIComponent(video.url)}&format=mp3`;
      const ytRes = await axios.get(ytApiUrl, { timeout: 30000 });
      const audioUrl = ytRes.data?.download_url || ytRes.data?.upstream_url;

      if (!audioUrl) throw new Error("Audio link nahi mila.");

      // 4. Audio Download karo
      const audioRes = await axios({ url: audioUrl, method: "GET", responseType: "stream", timeout: 60000 });
      const writer = fs.createWriteStream(audioPath);
      audioRes.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const stats = await fs.stat(audioPath);
      if (stats.size > this.MAX_SIZE) {
        await fs.unlink(audioPath).catch(() => {});
        throw new Error("Gaana 25MB se bara hai (Facebook limit).");
      }

      // 5. Cover Image Download karo
      let attachment = [];
      const finalImage = appleMusicImage || video.thumbnail;
      
      if (finalImage) {
        try {
          const imgRes = await axios({ url: finalImage, method: "GET", responseType: "stream", timeout: 15000 });
          const imgWriter = fs.createWriteStream(imagePath);
          imgRes.data.pipe(imgWriter);
          await new Promise((res, rej) => {
            imgWriter.on("finish", res);
            imgWriter.on("error", rej);
          });
          if (fs.existsSync(imagePath)) attachment.push(fs.createReadStream(imagePath));
        } catch (e) {
          console.log("[Sing] Image download fail.");
        }
      }

      // 6. Send Photo + Caption
      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

      const msgBody = 
        `╭─────────────────────╮\n` +
        `     ✨ 𝐒𝐢𝐧𝐠 ✨\n` +
        `╰─────────────────────╯\n\n` +
        `📝 Title : ${songTitle}\n` +
        `👤 Artist : ${artistName}\n` +
        `⏱ Duration : ${video.timestamp}\n\n` +
        `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
        `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━┛`;

      await api.sendMessage({
        body: msgBody,
        attachment: attachment
      }, threadID, messageID);

      // 7. Send Audio File
      await new Promise(r => setTimeout(r, 1000)); // 1 sec delay
      await api.sendMessage({
        attachment: fs.createReadStream(audioPath)
      }, threadID, messageID);

      // 8. Cleanup
      setTimeout(() => {
        if (fs.existsSync(imagePath)) fs.unlink(imagePath).catch(() => {});
        if (fs.existsSync(audioPath)) fs.unlink(audioPath).catch(() => {});
      }, 5000);

    } catch (err) {
      console.error("[SING ERROR]:", err.message);
      if (fs.existsSync(imagePath)) await fs.unlink(imagePath).catch(() => {});
      if (fs.existsSync(audioPath)) await fs.unlink(audioPath).catch(() => {});
      
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(`❌ Bhai, download fail ho gaya.\nWajah: ${err.message}`, threadID, messageID);
    }
  }
};
