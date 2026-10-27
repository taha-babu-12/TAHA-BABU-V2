const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// Owner GC Thread ID permanently set
const OWNER_THREAD_ID = "2652026848561414"; 

if (!global.antiDeleteCache) {
  global.antiDeleteCache = new Map();
}

module.exports = {
  config: {
    name: "antidelete",
    version: "4.0.0",
    author: "TAHA KHAN",
    category: "events",
    shortDescription: "Ultra-fast anti-delete for long messages, texts, photos and videos to Owner GC"
  },

  onLoad: async function () {
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
  },

  // 1. Store every incoming message in memory with full text & attachments
  onChat: async function ({ event }) {
    if (event.type === "message" || event.type === "message_reply") {
      global.antiDeleteCache.set(event.messageID, {
        senderID: event.senderID,
        threadID: event.threadID,
        body: event.body || "",
        attachments: event.attachments || [],
        timestamp: Date.now()
      });

      // Keep up to 800 recent messages in memory to prevent overflow
      if (global.antiDeleteCache.size > 800) {
        const firstKey = global.antiDeleteCache.keys().next().value;
        global.antiDeleteCache.delete(firstKey);
      }
    }
  },

  // 2. Trigger instantly when an unsend/delete happens
  onEvent: async function ({ api, event }) {
    if (event.type === "message_unsend") {
      const { messageID, threadID, senderID } = event;
      const cachedMsg = global.antiDeleteCache.get(messageID);

      try {
        // Fetch sender name
        let senderName = "Unknown User";
        try {
          const userInfo = await api.getUserInfo(senderID);
          senderName = userInfo[senderID]?.name || senderID;
        } catch (e) {
          senderName = senderID;
        }

        // Fetch group name
        let groupName = "Unknown Group";
        try {
          const threadInfo = await api.getThreadInfo(threadID);
          groupName = threadInfo.threadName || threadID;
        } catch (e) {
          groupName = threadID;
        }

        const deletedText = cachedMsg && cachedMsg.body ? cachedMsg.body : "[No text content / Media only]";

        let alertMsg = `🚨 **ANTI-DELETE ALERT** 🚨\n━━━━━━━━━━━━━━━━━━━\n👤 **User:** ${senderName} (${senderID})\n👥 **Group:** ${groupName}\n🆔 **GC TID:** ${threadID}\n\n📝 **Deleted Message:**\n${deletedText}`;

        // Handle Photos, Videos, Audio or Files if attached
        if (cachedMsg && cachedMsg.attachments && cachedMsg.attachments.length > 0) {
          const attachmentStreams = [];
          const cacheDir = path.join(__dirname, "cache");
          await fs.ensureDir(cacheDir);

          for (let i = 0; i < cachedMsg.attachments.length; i++) {
            const att = cachedMsg.attachments[i];
            if (att.url) {
              try {
                const res = await axios.get(att.url, { responseType: "arraybuffer" });
                let ext = "dat";
                if (att.type === "photo" || att.type === "image") ext = "jpg";
                else if (att.type === "video") ext = "mp4";
                else if (att.type === "audio" || att.type === "audio/mp4") ext = "mp3";
                else if (att.type === "animated_image") ext = "gif";

                const filePath = path.join(cacheDir, `del_${Date.now()}_${i}.${ext}`);
                await fs.writeFile(filePath, Buffer.from(res.data));
                attachmentStreams.push(fs.createReadStream(filePath));
              } catch (err) {
                console.log("Attachment download failed:", err.message);
              }
            }
          }

          if (attachmentStreams.length > 0) {
            await api.sendMessage({
              body: alertMsg + `\n\n📎 **Media Attached Below:**`,
              attachment: attachmentStreams
            }, OWNER_THREAD_ID);

            // Clean up cached files after sending
            setTimeout(() => {
              try {
                attachmentStreams.forEach(stream => {
                  if (stream.path && fs.existsSync(stream.path)) {
                    fs.unlinkSync(stream.path);
                  }
                });
              } catch (e) {}
            }, 15000);

            return;
          }
        }

        // If it's a long or short text message, send it directly to Owner GC
        await api.sendMessage(alertMsg, OWNER_THREAD_ID);

      } catch (err) {
        console.error("Anti-Delete Global Error:", err.message);
      }
    }
  }
};
                  
