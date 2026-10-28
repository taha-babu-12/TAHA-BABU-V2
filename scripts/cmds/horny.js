const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "horny",
    aliases: ["hc"],
    version: "1.0.0",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "horney card"
    },
    longDescription: {
      en: "horny card mention or replied user's PFP"
    },
    category: "fun",
    guide: {
      en: "{pn} @mention\n{pn} (reply to a user)"
    }
  },

  onStart: async function ({ api, event, message, args }) {
    let imageUrl = "";
    const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

    if (event.messageReply?.attachments?.length > 0) {
      const att = event.messageReply.attachments[0];
      let u = att.url || att.previewUrl || att.largePreviewUrl;
      if (!u && att.ID && api?.resolvePhotoUrl) {
        try { u = await api.resolvePhotoUrl(att.ID); } catch (_) {}
      }
      if (u) imageUrl = u;
    }
    if (!imageUrl && event.attachments?.length > 0) {
      const att = event.attachments[0];
      let u = att.url || att.previewUrl || att.largePreviewUrl;
      if (!u && att.ID && api?.resolvePhotoUrl) {
        try { u = await api.resolvePhotoUrl(att.ID); } catch (_) {}
      }
      if (u) imageUrl = u;
    }
    if (!imageUrl && event.mentions && Object.keys(event.mentions).length > 0) {
      const uid = Object.keys(event.mentions)[0];
      imageUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${token}`;
    } else if (!imageUrl && event.messageReply) {
      const uid = event.messageReply.senderID || event.messageReply.actorFbId;
      if (uid) imageUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${token}`;
    } else if (!imageUrl && args[0] && /^\d+$/.test(args[0].trim())) {
      imageUrl = `https://graph.facebook.com/${args[0].trim()}/picture?width=720&height=720&access_token=${token}`;
    } else if (!imageUrl && args[0] && args[0].startsWith("http")) {
      imageUrl = args[0];
    } else if (!imageUrl) {
      imageUrl = `https://graph.facebook.com/${event.senderID}/picture?width=720&height=720&access_token=${token}`;
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("😳", event.messageID, () => {}, true);
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/horny?avatar=${encodeURIComponent(imageUrl)}`;
      const stream = await global.utils.getStreamFromURL(apiUrl, "horny.png");

      return message.reply({
        body: "😳 *Horny License / Canvas*",
        attachment: stream
      });
    } catch (error) {
      console.error("Horny canvas error:", error.message);
      return message.reply(`❌ Failed to generate canvas: ${error.message}`);
    }
  }
};
