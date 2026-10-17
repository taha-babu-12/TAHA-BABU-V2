module.exports = {
  config: {
    name: "unban",
    version: "1.0.0",
    role: 2,
    author: "TAHA KHAN (standalone)",
    longDescription: "Restore a banned user so they can use the bot again",
    category: "group",
    guide: { en: "{pn} <UID/@tag/reply>: unban a user" }
  },

  onStart: async function ({ event, api, args, usersData }) {
    const { threadID, messageID, messageReply } = event;

    const targetID = messageReply
      ? messageReply.senderID
      : (Object.keys(event.mentions || {}).length > 0 ? Object.keys(event.mentions)[0] : args[0]);

    if (!targetID || isNaN(targetID)) {
      return api.sendMessage("Please mention, reply, or give a valid numeric UID!\nUsage: .unban <UID/@tag/reply>", threadID, messageID);
    }

    let nameTarget = `${targetID}`;
    try { nameTarget = await usersData.getName(targetID); } catch (e) { /* fallback to raw ID */ }

    try {
      await usersData.set(targetID, {
        banned: { status: false }
      });
      return api.sendMessage(`[ Unban User ] Unbanned user: ${targetID} - ${nameTarget}`, threadID, messageID);
    } catch (err) {
      console.error("[unban] Error:", err.message);
      return api.sendMessage(`[ Unban User ] Error occurred: ${err.message}`, threadID, messageID);
    }
  }
};