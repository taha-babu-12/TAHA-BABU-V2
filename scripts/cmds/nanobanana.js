const axios = require("axios");

module.exports = {
  config: {
    name: "nanobanana",
    aliases: ["nbedit"],
    version: "1.0",
    author: "Neoaz ゐ", //API by RIFAT
    countDown: 10,
    role: 0,
    shortDescription: { en: "Generate or edit image with Nano Banana" },
    longDescription: { en: "Generate or edit images using Nano Banana AI model" },
    category: "image",
    guide: {
      en: "{pn} <prompt> - Generate image\nReply to an image with: {pn} <prompt> - Edit image"
    }
  },

  onStart: async function ({ message, event, api, args }) {
    const hasPrompt = args.length > 0;
    const hasPhotoReply = event.type === "message_reply" && event.messageReply?.attachments?.[0]?.type === "photo";

    if (!hasPrompt && !hasPhotoReply) {
      return message.reply("Please provide a prompt or reply to an image.");
    }

    const prompt = args.join(" ").trim();
    const isEdit = hasPhotoReply;
    const model = isEdit ? "nano banana edit" : "nano banana";

    try {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const imageUrl = hasPhotoReply ? event.messageReply.attachments[0].url : undefined;

      const res = await axios.get("https://fluxcdibai-1.onrender.com/generate", {
        params: {
          prompt,
          model,
          ...(imageUrl ? { imageUrl } : {})
        },
        timeout: 120000
      });

      const data = res.data;
      const resultUrl = data?.data?.imageResponseVo?.url;

      if (!resultUrl) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("Failed to process image.");
      }

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      await message.reply({
        body: isEdit ? "Image edited 🐦" : "Image generated 🐦",
        attachment: await global.utils.getStreamFromURL(resultUrl)
      });

    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Error while processing image.");
    }
  }
};
