// Owner GC Thread ID
const OWNER_THREAD_IDS = ["2652026848561414"];
const MAX_CACHE = 500;

if (!global.antiDeleteStore) global.antiDeleteStore = new Map();

module.exports = {
  config: {
    name: "antidelete",
    aliases: ["adel", "antidel"],
    version: "4.0.0",
    author: "TAHA-KHAN",
    countDown: 2,
    role: 0, // must be 0 so onChat tracks every user, not just admins
    shortDescription: "Sends deleted messages directly to Owner GC",
    category: "system",
    guide: {
      en: "{pn} - Check anti-delete status"
    }
  },

  onChat: async function ({ api, event }) {
    const { type, messageID, threadID, senderID } = event;
    const store = global.antiDeleteStore;

    // 1. Cache incoming messages (with attachments)
    if (type === "message" || type === "message_reply") {
      if (senderID === api.getCurrentUserID()) return;

      store.set(messageID, {
        senderID,
        threadID,
        body: event.body || "",
        attachments: (event.attachments || [])
          .map(a => ({ type: a.type, url: a.url || a.previewUrl || null }))
          .filter(a => a.url),
        time: Date.now()
      });

      if (store.size > MAX_CACHE) {
        store.delete(store.keys().next().value);
      }
      return;
    }

    // 2. Unsend detected -> forward to Owner GC
    if (type === "message_unsend") {
      const cached = store.get(messageID);
      if (!cached) return;
      store.delete(messageID);

      let senderName = "Unknown User";
      let groupName = "Inbox";

      try {
        const userInfo = await api.getUserInfo(cached.senderID);
        senderName = userInfo[cached.senderID]?.name || senderName;
      } catch (e) {}

      try {
        const threadInfo = await api.getThreadInfo(cached.threadID);
        groupName = threadInfo.threadName || (threadInfo.isGroup ? "Unnamed Group" : "Inbox");
      } catch (e) {}

      const alertMsg =
        `🚨 ANTI-DELETE ALERT 🚨\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 User: ${senderName}\n` +
        `🆔 UID: ${cached.senderID}\n` +
        `👥 Group: ${groupName}\n` +
        `🧵 Thread ID: ${cached.threadID}\n\n` +
        `📝 Deleted Text:\n${cached.body || "[No text]"}`;

      // Send to every owner GC (streams are single-use, so re-download per GC)
      for (const gcID of OWNER_THREAD_IDS) {
        const files = [];
        for (const att of cached.attachments) {
          try {
            files.push(await global.utils.getStreamFromURL(att.url));
          } catch (e) {
            console.error("Anti-Delete attachment error:", e.message);
          }
        }

        try {
          await api.sendMessage(
            files.length ? { body: alertMsg, attachment: files } : alertMsg,
            gcID
          );
        } catch (err) {
          console.error("Anti-Delete Forward Error:", err.message);
        }
      }
    }
  },

  onStart: async function ({ message, event }) {
    const admins = global.GoatBot.config.adminBot || [];
    if (!admins.includes(event.senderID))
      return message.reply("❌ Only bot admins can use this command.");

    return message.reply(
      `✅ Anti-Delete Tracker is ACTIVE!\n🎯 Owner GC TID: ${OWNER_THREAD_IDS.join(", ")}\n💾 Cached messages: ${global.antiDeleteStore.size}`
    );
  }
};
