const axios = require("axios");
const { Jimp } = require("jimp");
const { Readable } = require("stream");
const fs = require("fs-extra");
const path = require("path");

const BASE_URL = "https://meta.nkx.lol";
const AZADX_EDITOR_API = "https://azadx69x.is-a.dev/api/editor";
const MAX_ATTACHMENT_BYTES = 26214400;

function formatError(res) {
  if (res.status === 422 && Array.isArray(res.data?.detail)) {
    return res.data.detail.map((d) => d.msg || d).join("; ");
  }
  if (res.status === 401) return "The API server rejected its own API key.";
  if (res.status === 404) return "That project/image could not be found.";
  if (res.status === 502) return "The Vibes provider failed to fulfill this request. Try again.";
  if (res.status === 503) return "The API server's Vibes session is misconfigured.";
  return res.data?.message || res.data?.error || `Request failed (status ${res.status}).`;
}

function extractEditedImageUrl(data) {
  const contentItem = data?.result?.contentItem;
  return contentItem?.imageUrl || contentItem?.structuredOutput?.image || null;
}

function extractImageUrlFromEvent(event, args = []) {
  if (global.utils && typeof global.utils.extractImageUrl === "function") {
    const extracted = global.utils.extractImageUrl(event, args, { allowAvatar: false });
    if (extracted) return extracted;
  }

  if (event.messageReply?.attachments?.length > 0) {
    for (const a of event.messageReply.attachments) {
      const u = a.url || a.largePreviewUrl || a.large_preview_url || a.previewUrl || a.preview_url || a.thumbnailUrl || a.thumbnail_url || a.image || a.photoUrl || a.image_data?.url || a.media?.image?.uri || a.facebookUrl;
      if (u) return u;
    }
  }

  if (event.attachments?.length > 0) {
    for (const a of event.attachments) {
      const u = a.url || a.largePreviewUrl || a.large_preview_url || a.previewUrl || a.preview_url || a.thumbnailUrl || a.thumbnail_url || a.image || a.photoUrl || a.image_data?.url || a.media?.image?.uri || a.facebookUrl;
      if (u) return u;
    }
  }

  if (event.messageReply?.body) {
    const match = event.messageReply.body.match(/https?:\/\/[^\s]+/i);
    if (match && /\.(jpe?g|png|webp|gif|bmp)(\?.*)?$/i.test(match[0])) {
      return match[0];
    }
  }

  if (Array.isArray(args) && args.length > 0 && typeof args[0] === "string" && /^https?:\/\//i.test(args[0])) {
    return args[0];
  }

  return null;
}

const FB_CLIENT_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

async function getUserAvatarUrl(uid, api, usersData) {
  const candidateUrls = [
    `https://graph.facebook.com/${uid}/picture?width=1500&height=1500&access_token=${FB_CLIENT_TOKEN}`,
    `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${FB_CLIENT_TOKEN}`,
    `https://graph.facebook.com/${uid}/picture?type=large`
  ];

  for (const url of candidateUrls) {
    try {
      const res = await axios.head(url, { timeout: 6000, validateStatus: s => s === 200 || s === 302 });
      if (res.status === 200 || res.status === 302) return url;
    } catch (_) {}
  }

  if (usersData && typeof usersData.getAvatarUrl === "function") {
    try {
      const dbUrl = await usersData.getAvatarUrl(uid);
      if (dbUrl) return dbUrl;
    } catch (_) {}
  }

  if (api && typeof api.getUserInfo === "function") {
    try {
      const info = await api.getUserInfo(uid);
      const pic = info?.[uid]?.profilePicUrl || info?.[uid]?.thumbSrc;
      if (pic) return pic;
    } catch (_) {}
  }

  return `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${FB_CLIENT_TOKEN}`;
}

async function downloadToBuffer(fileUrl) {
  const res = await axios.get(fileUrl, {
    responseType: "arraybuffer",
    timeout: 60000,
    maxContentLength: MAX_ATTACHMENT_BYTES,
    maxBodyLength: MAX_ATTACHMENT_BYTES,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  return Buffer.from(res.data);
}

module.exports = {
  config: {
    name: "edit",
    aliases: ["imagedit", "ai-edit", "transform", "editimg"],
    version: "4.2.0",
    author: "frnAlt",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "AI image editing & transformation"
    },
    longDescription: {
      en: "Reply to an image with an edit prompt, or use -pfp to edit any user's profile picture using AI image engines or local Canvas effects"
    },
    category: "ai-image",
    guide: {
      en: "Reply to an image: {pn} <edit prompt>\n• Custom PFP edit: (reply to user or tag) {pn} -pfp <prompt>\n\nExamples:\n• (reply to user): {pn} -pfp make 4k\n• (reply to user): {pn} -pfp anime style\n• (reply to photo): {pn} make it cyberpunk anime style\n• (reply to photo): {pn} 3D Pixar cartoon version\n• (reply to photo): {pn} blur 10\n• (reply to photo): {pn} circle"
    }
  },

  onStart: async function ({ message, event, args, api, commandName, usersData }) {
    const prefix = global.GoatBot?.config?.prefix || global.FloppaBot?.config?.prefix || "";
    const isPfpMode = args.some(a => ["-pfp", "--pfp", "-avatar", "--avatar", "-profile"].includes(a.toLowerCase()));

    let prompt = "";
    let imageUrl = null;
    let targetName = null;

    if (isPfpMode) {
      let targetUID = null;

      if (event.messageReply) {
        targetUID = event.messageReply.senderID || event.messageReply.actorFbId || event.messageReply.userID || event.messageReply.author;
      } else if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetUID = Object.keys(event.mentions)[0];
        targetName = event.mentions[targetUID]?.replace(/^@/, "").trim();
      } else {
        const uidIndex = args.findIndex(a => /^\d{5,}$/.test(a) && !["-pfp", "--pfp", "-avatar", "--avatar"].includes(a.toLowerCase()));
        if (uidIndex !== -1) {
          targetUID = args[uidIndex];
          args.splice(uidIndex, 1);
        } else {
          targetUID = event.senderID;
        }
      }

      prompt = args.filter(a => !["-pfp", "--pfp", "-avatar", "--avatar", "-profile"].includes(a.toLowerCase())).join(" ").trim();
      if (!prompt) {
        prompt = "enhance photo, high quality 4k portrait";
      }

      if (targetUID) {
        imageUrl = await getUserAvatarUrl(targetUID, api, usersData);
        if (!targetName && usersData?.getName) {
          targetName = await usersData.getName(targetUID).catch(() => null);
        }
      }
    } else {
      prompt = args.join(" ").trim();
      imageUrl = extractImageUrlFromEvent(event, args);
      if (imageUrl && args.length > 0 && args[0].startsWith("http")) {
        prompt = args.slice(1).join(" ").trim();
      }
    }

    if (!imageUrl) {
      return message.reply(
        `📸 Please reply to an image message or use: ${prefix}${commandName} -pfp <prompt>\n\n💡 Example: Reply to a user with: ${prefix}${commandName} -pfp make 4k`
      );
    }

    if (!prompt) {
      return message.reply(
        `⚠️ Please provide an edit prompt or effect instruction.\n\n💡 Usage: (reply to image) ${prefix}${commandName} <edit prompt>\n💡 Example: ${prefix}${commandName} -pfp make 4k\n💡 Canvas actions: circle, rounded, blur, sharpen, grayscale, sepia, invert, rotate, flip, resize`
      );
    }

    if (api?.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    const CANVAS_ACTIONS = [
      "circle", "rounded", "resize", "crop", "rotate", "flip",
      "blur", "sharpen", "grayscale", "greyscale", "sepia", "invert",
      "brightness", "contrast"
    ];
    const firstArg = (args[0] || "").toLowerCase();

    try {
      let finalStream = null;
      let appliedType = "AI Edit";

      // ─── 1. Local Jimp Canvas Actions (Instant) ───────────────────────────
      if (CANVAS_ACTIONS.includes(firstArg)) {
        appliedType = `Canvas: ${firstArg.toUpperCase()}`;
        const action = firstArg;
        const jimg = await Jimp.read(imageUrl);

        if (action === "circle" || action === "rounded") {
          jimg.circle();
        } else if (action === "grayscale" || action === "greyscale") {
          jimg.greyscale();
        } else if (action === "sepia") {
          jimg.sepia();
        } else if (action === "invert") {
          jimg.invert();
        } else if (action === "blur") {
          const radius = parseInt(args[1], 10) || 5;
          jimg.blur(Math.min(25, Math.max(1, radius)));
        } else if (action === "rotate") {
          const deg = parseInt(args[1], 10) || 90;
          jimg.rotate(deg);
        } else if (action === "flip") {
          const vertical = (args[1] || "").toLowerCase().startsWith("v");
          jimg.flip({ horizontal: !vertical, vertical });
        } else if (action === "resize" && args[1] && args[2]) {
          const w = parseInt(args[1], 10) || 512;
          const h = parseInt(args[2], 10) || 512;
          jimg.resize({ w: Math.min(1920, w), h: Math.min(1920, h) });
        } else if (action === "brightness") {
          const val = parseInt(args[1], 10) || 20;
          jimg.color([{ apply: val >= 0 ? "brighten" : "darken", params: [Math.abs(val)] }]);
        } else if (action === "contrast") {
          const val = parseFloat(args[1]) || 0.3;
          jimg.contrast(Math.min(1, Math.max(-1, val)));
        }

        const buf = await jimg.getBuffer("image/png");
        finalStream = Readable.from(buf);
        finalStream.path = `edit_${action}.png`;
      }

      // ─── 2. Primary: Toshiro AI Image Edit API with Imgur Upload ──────────
      if (!finalStream) {
        let imgurUrl = null;

        try {
          if (imageUrl.includes("imgur.com")) {
            imgurUrl = imageUrl;
          } else {
            const imgurRes = await axios.get(`https://toshiro-api-editz6t9.vercel.app/api/tools/Imgur?url=${encodeURIComponent(imageUrl)}`, { timeout: 15000 });
            if (imgurRes.data?.success && imgurRes.data?.result?.url) {
              imgurUrl = imgurRes.data.result.url;
            }
          }
        } catch (imgErr) {
          console.warn("[EDIT] Imgur upload warning:", imgErr.message);
        }

        const targetUrl = imgurUrl || imageUrl;

        try {
          const editApiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/edit?url=${encodeURIComponent(targetUrl)}&prompt=${encodeURIComponent(prompt)}`;
          const editRes = await axios.get(editApiUrl, { timeout: 45000 });
          if (editRes.data?.success && editRes.data?.url) {
            const buffer = await downloadToBuffer(editRes.data.url);
            finalStream = Readable.from(buffer);
            finalStream.path = "edited.png";
            appliedType = "AI Edit";
          }
        } catch (editApiErr) {
          console.warn("[EDIT] Toshiro edit API error:", editApiErr.message);
        }
      }

      // ─── 2.5. NEW Fallback: Azadx69x Editor API ──────────────────────────
      if (!finalStream) {
        try {
          const azadxUrl = `${AZADX_EDITOR_API}?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;
          const azadxRes = await axios.get(azadxUrl, {
            responseType: "stream",
            timeout: 45000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "image/*,*/*;q=0.8"
            },
            validateStatus: (s) => s === 200
          });

          if (azadxRes.status === 200 && azadxRes.data) {
            finalStream = azadxRes.data;
            finalStream.path = "azadx_edit.png";
            appliedType = "Azadx AI Edit";
            console.log("[EDIT] Success via Azadx69x API");
          }
        } catch (azadxErr) {
          console.warn("[EDIT] Azadx69x editor API error:", azadxErr.message);
        }
      }

      // ─── 3. Fallback: Goatbot-V2 Edit API (meta.nkx.lol) ──────────────────
      if (!finalStream) {
        try {
          const res = await axios.post(`${BASE_URL}/v1/images/edit`, {
            image_url: imageUrl,
            prompt: prompt,
            project_name: "Floppa image edit"
          }, {
            timeout: 25000,
            validateStatus: () => true
          });

          if (res.status < 400 && res.data) {
            const editedUrl = extractEditedImageUrl(res.data);
            if (editedUrl) {
              const buffer = await downloadToBuffer(editedUrl);
              finalStream = Readable.from(buffer);
              finalStream.path = "edit.jpg";
              appliedType = "AI Transform";
            }
          }
        } catch (_) {
          // Fall through to next fallback
        }
      }

      // ─── 4. Fallback: Pollinations Turbo Img2Img Engine ───────────────────
      if (!finalStream) {
        try {
          const turboUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?image=${encodeURIComponent(imageUrl)}&width=768&height=768&model=turbo&nologo=true`;
          finalStream = await global.utils.getStreamFromURL(turboUrl, "edit.jpg", { timeout: 25000 });
          appliedType = "AI Turbo Edit";
        } catch (turboErr) {
          console.warn("[EDIT] Pollinations turbo failed, using local Jimp fallback:", turboErr.message);
          const jimg = await Jimp.read(imageUrl);
          jimg.contrast(0.2);
          const buf = await jimg.getBuffer("image/png");
          finalStream = Readable.from(buf);
          finalStream.path = "edit.png";
          appliedType = "Enhanced Edit";
        }
      }

      if (!finalStream) {
        throw new Error("Could not produce edited image stream.");
      }

      if (api?.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }

      await message.reply({
        attachment: finalStream
      });
    } catch (err) {
      console.error("[EDIT COMMAND ERROR]:", err);
      if (api?.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      }
      return message.reply(`Failed to edit image: ${err.message || err}`);
    }
  }
};
