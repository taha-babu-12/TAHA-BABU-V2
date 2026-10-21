const axios = require("axios");

const MIDDLEWARE_URL = "https://xrahat-dev-undress.vercel.app/undress";

module.exports = {
  config: {
    name:             "undress", // ⚠️ Don't Change Name — Cmd Will Not Work✅
    version:          "1.0",
    author:           "🔰𝐗ʀᴀʜᴀᴛ-ᴅᴇᴠ🔰", // ⚠️ Don't Change Credit — Cmd Won't Work✅
    countDown:        10,
    role:             2,
    shortDescription: {
      en: "AI image edit using undress"
    },
    description: {
      en: "Reply to an image with /undress to edit it using AI"
    },
    category: "AI",
    guide: {
      en: "Reply to a photo with {pn}undress"
    }
  },

  langs: {
    en: {
      noReply:      "❌ Please reply to an image with {pn}undress",
      noImage:      "❌ No image found in the replied message.",
      noUrl:        "❌ Could not get image URL.",
      waiting:      "💦Please wait....",
      error:        "⚠️ %1",
      success:      "Malta Kemon dekto 😛"
    }
  },

  onStart: async function ({ api, args, message, event, getLang }) {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply) {
      return message.reply(getLang("noReply"));
    }

    const attachments = messageReply.attachments || [];
    const imgAttach   = attachments.find(
      a => a.type === "photo" || a.type === "image" || a.type === "sticker"
    );

    if (!imgAttach) {
      return message.reply(getLang("noImage"));
    }

    const imageUrl = imgAttach.url || imgAttach.largePreviewUrl || imgAttach.previewUrl;

    if (!imageUrl) {
      return message.reply(getLang("noUrl"));
    }

    const waitMsg = await message.reply(getLang("waiting"));

    try {
      // ⚠️ VERY IMPORTANT: use config.author directly. Don't make a hardcoded copy.
      // The special Unicode characters in the credit string can be altered by copy-paste.
      const credit = module.exports.config.author;

      const response = await axios.post(
        MIDDLEWARE_URL,
        { imageUrl, credit },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 90000,
        }
      );

      const data = response.data;

      if (!data.success || !data.resultUrl) {
        throw new Error(data.error || "API Error");
      }

      const { resultUrl } = data;

      // ✅ নতুন ক্যাপশন — শুধু এটাই বদলেছে
      const customCaption = getLang("success");

      const imgStream = await global.utils.getStreamFromURL(resultUrl);
      api.unsendMessage(waitMsg.messageID);

      await message.reply({
        body:       customCaption,
        attachment: imgStream,
      });

    } catch (error) {
      api.unsendMessage(waitMsg.messageID);
      const msg = error.response?.data?.error || error.message || "Unknown error";
      return message.reply(getLang("error", msg));
    }
  }
};
