const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ====== SETTINGS ======
const OWNER_THREAD_ID = "2652026848561414";
const MAX_CACHE_SIZE = 800;
const DOWNLOAD_TIMEOUT = 15000;
// ======================

if (!global.antiDeleteCache) global.antiDeleteCache = new Map();

module.exports = {
  config: {
    name: "antidelete",
    version: "5.0.0",
    author: "TAHA KHAN",
    category: "events"
  },

  // ────────────────────────────────────────
  // STEP 1: File load hone pe check
  // ────────────────────────────────────────
  onLoad: async function ({ api }) {
    console.log("════════════════════════════════════════");
    console.log("✅ [antidelete] MODULE LOADED");
    console.log("   Owner GC:", OWNER_THREAD_ID);
    console.log("════════════════════════════════════════");

    // OWNER_GC reachable hai ya nahi — test message bhejo
    try {
      await api.sendMessage(
        "✅ [antidelete] Module loaded successfully.\nAb jab bhi koi message delete karega, main yahan alert dunga.",
        OWNER_THREAD_ID
      );
      console.log("✅ [antidelete] Test message sent to Owner GC");
    } catch (e) {
      console.log("❌ [antidelete] CANNOT send to Owner GC:", e.message);
      console.log("   → Bot ko GC", OWNER_THREAD_ID, "mein add karo");
    }
  },

  // ────────────────────────────────────────
  // STEP 2: Messages cache
  // ────────────────────────────────────────
  onChat: async function ({ api, event }) {
    if (event.type !== "message" && event.type !== "message_reply") return;
    cacheMessage(api, event);
  },

  // ────────────────────────────────────────
  // STEP 3: Unsend detection (both hooks)
  // ────────────────────────────────────────
  onEvent: async function ({ api, event, usersData, threadsData }) {
    if (isUnsend(event)) {
      await handleUnsend({ api, event, usersData, threadsData });
    }
  },

  onStart: async function ({ api, event, usersData, threadsData }) {
    if (isUnsend(event)) {
      await handleUnsend({ api, event, usersData, threadsData });
    }
  }
};

// ═══════════════ HELPERS ═══════════════

function isUnsend(event) {
  if (!event) return false;
  const t = (event.type || "").toLowerCase();
  const lt = (event.logMessageType || "").toLowerCase();
  return (
    t === "message_unsend" ||
    t === "message_delete" ||
    lt === "message_unsend" ||
    lt === "log:unsend" ||
    t.includes("unsend") ||
    lt.includes("unsend")
  );
}

function cacheMessage(api, event) {
  if (!event.messageID || !event.senderID) return;

  // Skip bot's own
  try {
    const botID = api.getCurrentUserID?.();
    if (botID && event.senderID === botID) return;
  } catch (e) {}

  global.antiDeleteCache.set(event.messageID, {
    senderID: event.senderID,
    threadID: event.threadID,
    body: event.body || "",
    attachments: event.attachments || [],
    timestamp: Date.now()
  });

  if (global.antiDeleteCache.size > MAX_CACHE_SIZE) {
    global.antiDeleteCache.delete(global.antiDeleteCache.keys().next().value);
  }

  console.log(
    `[antidelete] 📥 Cached | id:${event.messageID.slice(-8)} | body:"${(event.body || "").slice(0, 30)}"`
  );
}

async function handleUnsend({ api, event, usersData, threadsData }) {
  const messageID = event.messageID || event.messageId;
  const threadID = event.threadID;
  const senderID = event.senderID || event.author;

  console.log(`\n[antidelete] 🚨 UNSEND DETECTED`);
  console.log(`   msgID: ${messageID}`);
  console.log(`   threadID: ${threadID}`);
  console.log(`   senderID: ${senderID}`);

  const cached = global.antiDeleteCache.get(messageID);
  global.antiDeleteCache.delete(messageID);

  if (cached) {
    console.log(`[antidelete] ✅ Found in cache`);
  } else {
    console.log(`[antidelete] ⚠️ NOT in cache — message may have been cached under different ID`);
  }

  try {
    // Names
    let senderName = senderID || "Unknown";
    let groupName = threadID || "Unknown";

    try {
      if (usersData?.getName && senderID) {
        senderName = (await usersData.getName(senderID)) || senderID;
      }
    } catch (e) {}

    try {
      if (threadsData?.get) {
        const td = await threadsData.get(threadID);
        groupName = td?.threadName || threadID;
      }
    } catch (e) {}

    const bodyText = cached?.body?.trim() || "[No text / Media only]";

    const alertMsg =
      `🚨 ANTI-DELETE ALERT 🚨\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `👤 User: ${senderName} (${senderID})\n` +
      `👥 Group: ${groupName}\n` +
      `🆔 TID: ${threadID}\n\n` +
      `📝 Deleted Message:\n${bodyText}`;

    // Download attachments
    const filePaths = [];
    const streams = [];
    const cacheDir = path.join(__dirname, "..", "cache", "antidelete");
    await fs.ensureDir(cacheDir);

    if (cached?.attachments?.length) {
      console.log(`[antidelete] 📎 Attachments: ${cached.attachments.length}`);

      for (let i = 0; i < cached.attachments.length; i++) {
        const att = cached.attachments[i];
        if (!att) continue;

        const url =
          att.url || att.playableUrl || att.downloadUrl ||
          att.previewUrl || att.thumbnailUrl;
        if (!url) continue;

        let ext = "dat";
        if (att.type === "photo") ext = "jpg";
        else if (att.type === "video") ext = "mp4";
        else if (att.type === "audio") ext = "mp3";
        else if (att.type === "animated_image") ext = "gif";

        try {
          const res = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: DOWNLOAD_TIMEOUT,
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          const fp = path.join(cacheDir, `del_${Date.now()}_${i}.${ext}`);
          await fs.writeFile(fp, Buffer.from(res.data));
          filePaths.push(fp);
          streams.push(fs.createReadStream(fp));
          console.log(`[antidelete] 📥 Downloaded attachment ${i} (${ext})`);
        } catch (e) {
          console.log(`[antidelete] ⚠️ Attachment ${i} failed: ${e.message}`);
        }
      }
    }

    // Send
    console.log(`[antidelete] 📤 Sending to Owner GC...`);

    if (streams.length > 0) {
      try {
        await api.sendMessage(
          { body: alertMsg + "\n\n📎 Media below:", attachment: streams },
          OWNER_THREAD_ID
        );
        console.log(`[antidelete] ✅ Sent (with media)`);
      } catch (e) {
        console.log(`[antidelete] ⚠️ Multi-send failed: ${e.message}`);
        await api.sendMessage(alertMsg, OWNER_THREAD_ID).catch(e2 =>
          console.log(`[antidelete] ❌ Text send failed: ${e2.message}`)
        );
        for (const fp of filePaths) {
          try {
            await api.sendMessage({ attachment: fs.createReadStream(fp) }, OWNER_THREAD_ID);
          } catch (e3) {}
        }
      }
    } else {
      await api.sendMessage(alertMsg, OWNER_THREAD_ID);
      console.log(`[antidelete] ✅ Sent (text)`);
    }

    // Cleanup
    setTimeout(() => {
      filePaths.forEach(p => {
        try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
      });
    }, 6000);

  } catch (err) {
    console.log(`[antidelete] ❌ Error:`, err.message);
  }
}
