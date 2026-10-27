const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "kick",
    version: "1.0.0",
    author: "TAHA KHAN",
    countDown: 5,
    role: 1,
    description: "Kick a member out of the group",
    category: "box chat",
    guide: {
      en: "{pn} @tag | {pn} [uid] | {pn} [link] | reply {pn} [reason]"
    }
  },

  langs: {
    en: {
      needAdmin: "⚠️ Bot needs admin permission with 'remove members' right to kick!",
      missingId: "⚠️ Please tag someone, give a UID, paste a Facebook link, or reply to a message.",
      userNotInGroup: "❌ This user is not in the group.",
      selfKick: "❌ You cannot kick yourself.",
      botKick: "❌ You cannot kick the bot.",
      adminKick: "❌ Cannot kick a group admin.",
      kicked: "✅ Kicked %1 from the group.\n📝 Reason: %2\n⏰ Time: %3",
      kickedNoReason: "✅ Kicked %1 from the group.\n⏰ Time: %2",
      error: "❌ Failed to kick: %1"
    }
  },

  onStart: async function ({ api, event, args, message, getLang }) {
    const { threadID, senderID, mentions, messageReply } = event;

    try {
      // 1) Get thread info to verify bot is admin
      const threadInfo = await api.getThreadInfo(threadID);
      const botID = String(api.getCurrentUserID());
      const adminIDs = (threadInfo.adminIDs || []).map(a => String(a.id));

      if (!adminIDs.includes(botID)) {
        return message.reply(getLang("needAdmin"));
      }

      // 2) Determine target user ID
      let targetID = null;

      // From mention
      if (mentions && Object.keys(mentions).length > 0) {
        targetID = String(Object.keys(mentions)[0]);
      }
      // From reply
      else if (messageReply && messageReply.senderID) {
        targetID = String(messageReply.senderID);
      }
      // From numeric UID
      else if (args[0] && /^\d+$/.test(args[0])) {
        targetID = args[0];
      }
      // From Facebook link
      else if (args[0] && /facebook\.com|fb\.com/i.test(args[0])) {
        const match = args[0].match(/(?:profile\.php\?id=|\/)(\d{5,})/);
        if (match) targetID = match[1];
      }

      if (!targetID) return message.reply(getLang("missingId"));

      // 3) Safety checks
      if (targetID === String(senderID)) return message.reply(getLang("selfKick"));
      if (targetID === botID) return message.reply(getLang("botKick"));
      if (adminIDs.includes(targetID)) return message.reply(getLang("adminKick"));

      // 4) Is target actually in the group?
      const participantIDs = (threadInfo.participantIDs || []).map(String);
      if (!participantIDs.includes(targetID)) {
        return message.reply(getLang("userNotInGroup"));
      }

      // 5) Get name BEFORE kicking
      let targetName = targetID;
      try {
        const userInfo = await api.getUserInfo(targetID);
        if (userInfo && userInfo[targetID] && userInfo[targetID].name) {
          targetName = userInfo[targetID].name;
        }
      } catch (_) { /* ignore */ }

      // 6) Extract reason from args (drop mention tags, UID, links)
      const reason = args
        .filter(a => {
          if (!a) return false;
          if (a.startsWith("@")) return false;
          if (/^\d+$/.test(a)) return false;
          if (/facebook\.com|fb\.com/i.test(a)) return false;
          return true;
        })
        .join(" ")
        .trim();

      // 7) Perform the kick
      try {
        await api.removeUserFromGroup(targetID, threadID);
      } catch (err) {
        const msg = (err && (err.error || err.message)) || "Unknown error";
        return message.reply(getLang("error", msg));
      }

      // 8) Confirm
      const time = moment.tz("Asia/Dhaka").format("hh:mm A, DD/MM/YYYY");
      return message.reply(
        reason
          ? getLang("kicked", targetName, reason, time)
          : getLang("kickedNoReason", targetName, time)
      );
    } catch (err) {
      return message.reply(getLang("error", (err && err.message) || "Unknown error"));
    }
  }
};
