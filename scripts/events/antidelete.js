const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ====== SETTINGS ======
const OWNER_THREAD_ID = "2652026848561414";  // Owner GC jahan alert jayega
const MAX_CACHE_SIZE = 8000;                  // Max messages cached in memory
const DOWNLOAD_TIMEOUT = 15000;              // Attachment download timeout (ms)
const CLEANUP_DELAY = 6000;                  // Temp file cleanup delay (ms)
// ======================

if (!global.antiDeleteCache) global.antiDeleteCache = new Map();

module.exports = {
  config: {
    name: "antidelete",
    version: "4.2.0",
    author: "TAHA KHAN",
    category: "events",
    shortDescription: "Ultra-fast anti-delete for texts, photos, videos to Owner GC"
  },

  langs: {
    en: {
      alertHeader: "🚨 ANTI-DELETE ALERT 🚨",
      userLabel: "User",
      groupLabel: "Group",
      gcTidLabel: "GC TID",
      deletedLabel: "Deleted Message",
      mediaAttached: "Media Attached Below",
      noText: "[No text / Media only]"
    }
  },

  onStart: async ({ api, event, usersData, threadsData, getLang }) => {
    if (!event) return;

    // ---------------------------------------------
    // 1) CACHE EVERY INCOMING MESSAGE
    // ---------------------------------------------
    if (event.type === "message" || event.type === "message_reply") {
      // Skip bot's own outgoing messages (prevents loops)
      const botID = api.getCurrentUserID();
      if (event.senderID === botID) return;
      if (!event.messageID) return;

      global.antiDeleteCache.set(event.messageID, {
        senderID: event.senderID,
        threadID: event.threadID,
        body: event.body || "",
        attachments: event.attachments || [],
        timestamp: Date.now()
      });

      // Trim cache if too big
      if (global.antiDeleteCache.size > MAX_CACHE_SIZE) {
        global.antiDeleteCache.delete(global.antiDeleteCache.keys().next().value);
      }
      return;
    }

    // ---------------------------------------------
    // 2) HANDLE UNSEND / DELETE
    // ---------------------------------------------
    if (event.type === "message_unsend") {
      const { messageID, threadID, senderID } = event;
      const cachedMsg = global.antiDeleteCache.get(messageID);

      // Remove immediately to prevent duplicate alerts
      global.antiDeleteCache.delete(messageID);

      try {
        // ---- Get sender name ----
        let senderName = senderID;
        try {
          senderName = (await usersData.getName(senderID)) || senderID;
        } catch (e) {}

        // ---- Get group name ----
        let groupName = threadID;
        try {
          const threadData = await threadsData.get(threadID);
          groupName = threadData?.threadName || threadID;
        } catch (e) {}

        const deletedText = cachedMsg?.body?.trim() || getLang("noText");

        const alertMsg =
          `${getLang("alertHeader")}\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `👤 ${getLang("userLabel")}: ${senderName} (${senderID})\n` +
          `👥 ${getLang("groupLabel")}: ${groupName}\n` +
          `🆔 ${getLang("gcTidLabel")}: ${threadID}\n\n` +
          `📝 ${getLang("deletedLabel")}:\n${deletedText}`;

        // ---- Download attachments if any ----
        const filePaths = [];
        const streams = [];
        const cacheDir = path.join(__dirname, "..", "cache", "antidelete");
        await fs.ensureDir(cacheDir);

        if (cachedMsg && Array.isArray(cachedMsg.attachments) && cachedMsg.attachments.length > 0) {
          for (let i = 0; i < cachedMsg.attachments.length; i++) {
            const att = cachedMsg.attachments[i];
            if (!att) continue;

            const url =
              att.url ||
              att.playableUrl ||
              att.downloadUrl ||
              att.previewUrl ||
              att.thumbnailUrl;
            if (!url) continue;

            let ext = "dat";
            if (att.type === "photo") ext = "jpg";
            else if (att.type === "video") ext = "mp4";
            else if (att.type === "audio") ext = "mp3";
            else if (att.type === "animated_image") ext = "gif";
            else if (att.type === "file") ext = "bin";

            try {
              const res = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: DOWNLOAD_TIMEOUT,
                maxContentLength: 100 * 1024 * 1024, // 100MB cap
                headers: { "User-Agent": "Mozilla/5.0" }
              });

              const filePath = path.join(cacheDir, `del_${Date.now()}_${i}.${ext}`);
              await fs.writeFile(filePath, Buffer.from(res.data));

              filePaths.push(filePath);
              streams.push(fs.createReadStream(filePath));
            } catch (e) {
              console.log(`[antidelete] Attachment ${i} download failed:`, e.message);
            }
          }
        }

        // ---- Send alert to OWNER GC ----
        if (streams.length > 0) {
          try {
            await api.sendMessage(
              {
                body: alertMsg + `\n\n📎 ${getLang("mediaAttached")}:`,
                attachment: streams
              },
              OWNER_THREAD_ID
            );
          } catch (sendErr) {
            // Fallback: text first, then attachments one by one
            console.log("[antidelete] Multi-send failed, retrying:", sendErr.message);
            await api.sendMessage(alertMsg, OWNER_THREAD_ID).catch(() => {});
            for (const fp of filePaths) {
              try {
                await api.sendMessage({ attachment: fs.createReadStream(fp) }, OWNER_THREAD_ID);
              } catch (e) {}
            }
          }
        } else {
          await api.sendMessage(alertMsg, OWNER_THREAD_ID);
        }

        // ---- Cleanup temp files ----
        setTimeout(() => {
          filePaths.forEach((p) => {
            try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
          });
        }, CLEANUP_DELAY);

      } catch (err) {
        console.error("[antidelete] Global error:", err.message);
      }
    }
  }
};
