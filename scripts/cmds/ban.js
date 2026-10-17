const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

function ensureSilentBan() {
  if (!config.hideNotiMessage) config.hideNotiMessage = {};
  if (config.hideNotiMessage.userBanned !== true) {
    config.hideNotiMessage.userBanned = true;
    try {
      writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
      console.log("[ban] Silent-ban config applied automatically");
    } catch (e) {
      console.error("[ban] Could not persist silent-ban config:", e.message);
    }
  }
}
ensureSilentBan();

async function isSenderBanned(params) {
  try {
    const senderID = params?.event?.senderID || params?.event?.userID || params?.event?.author;
    if (!senderID || !params?.usersData?.get) return false;
    const banned = await params.usersData.get(String(senderID), "banned", {});
    return banned?.status === true;
  } catch (e) {
    return false;
  }
}

function guardOnChatCommands() {
  const names = global.GoatBot?.onChat || [];
  for (const name of names) {
    const command = global.GoatBot.commands.get(name);
    if (!command || typeof command.onChat !== "function") continue;
    if (command.onChat.__banGuarded) continue;

    const original = command.onChat;
    const guarded = async function (params) {
      if (await isSenderBanned(params)) return;
      return original.apply(this, arguments);
    };
    guarded.__banGuarded = true;
    command.onChat = guarded;
  }
}
guardOnChatCommands();

module.exports = {
  config: {
    name: "ban",
    version: "7.0.0",
    role: 2,
    author: "TAHA KHAN (rebuilt, standalone)",
    longDescription: "Completely ignore a banned user — blocks prefix commands AND every onChat command",
    category: "group",
    guide: { en: "{pn} <UID/@tag/reply>: ban a user" }
  },

  onStart: async function ({ event, api, args, usersData }) {
    ensureSilentBan();
    guardOnChatCommands();

    const { threadID, messageID, messageReply } = event;

    const targetID = messageReply
      ? messageReply.senderID
      : (Object.keys(event.mentions || {}).length > 0 ? Object.keys(event.mentions)[0] : args[0]);

    if (!targetID || isNaN(targetID)) {
      return api.sendMessage("Please mention, reply, or give a valid numeric UID!\nUsage: .ban <UID/@tag/reply>", threadID, messageID);
    }

    let nameTarget = `${targetID}`;
    try { nameTarget = await usersData.getName(targetID); } catch (e) { /* fallback to raw ID */ }

    try {
      await usersData.set(targetID, {
        banned: { status: true, reason: "Banned by admin", date: Date.now() }
      });
      return api.sendMessage(`[ Ban User ] Banned user: ${targetID} - ${nameTarget}`, threadID, messageID);
    } catch (err) {
      console.error("[ban] Error:", err.message);
      return api.sendMessage(`[ Ban User ] Error occurred: ${err.message}`, threadID, messageID);
    }
  },

  onChat: async function () {
    guardOnChatCommands();
  }
};