*cmd install left.js const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

/* ══════════════════════════════════════════════════════════════
   🪦 TEMPLATE
   ══════════════════════════════════════════════════════════════ */
const TEMPLATE_URL = "https://files.catbox.moe/ugr1d6.jpg";

/* Messenger icon ki position (image size ke mutabiq)
   x, y = center, size = diameter (width ke mutabiq) */
const POS = { x: 0.509, y: 0.514, size: 0.325 };

/* Agar koi khud jaye toh auto chale ga. 
   Agar koi kick ho toh bhi chalana ho toh ise true kar dein */
const INCLUDE_KICKED = false;

/* {name} ki jagah left lene wale member ka naam aur tag aayega */
const FUNNY_LINES = [
  "😹 {name} sahab group se left le kar bhaag gaye! Bill dene ke dar se?",
  "⚰️ {name} group se left le liya hai, sabhi log ek minute ki khamoshi ikhtiyar karein 😭",
  "🏃‍♂️ {name} ne left le liya! Lagta hai hamara standard uske layeq nahi tha 🤣",
  "😂 {name} chala gaya, lagta hai net package khatam ho gaya tha!",
  "💀 {name} ne group chor diya, uski rooh ki sakoon ki dua karte hain 🕯️",
  "🤣 {name} ne left le liya! Hamari bakwas bardasht nahi kar saka bhai",
  "😹 {name} group se farar ho gaya! Koi pakad ke laao, abhi maza baaki tha",
  "🕯️ {name} member ne left le liya. Aaj se group thoda shant aur soona lag raha hai 😔",
  "😆 {name} left! Biwi ne mana kiya tha kya group chalane se?",
  "🪦 {name} ab nahi raha (group mein)! Wajah: Bar bar left lene ki buri aadat",
  "😭 {name} chala gaya, ab hum kiske sath gossip karenge?",
  "🤡 {name} ne left le liya! Arey bhai, gussa ho kar group thodi chorte hain?",
  "🚪 {name} darwaza khol kar nikal liya, ab shayad kabhi wapas nahi aayega 😹",
  "🙏 {name} group chor ke chala gaya, wapas aa ja bhai, tere bina ye group bhoot bangla lagta hai! 👻"
];

const TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

let templateCache = null;
let lastLineIndex = -1;
const recentLeaves = new Map();

/* ─────────────────────────────────────────────
   Reaction helper (kabhi error nahi dega)
   ───────────────────────────────────────────── */
function react(api, emoji, messageID) {
  return new Promise(resolve => {
    try {
      api.setMessageReaction(emoji, messageID, () => resolve(), true);
    } catch (_) {
      resolve();
    }
  });
}

/* ─────────────────────────────────────────────
   Template loader
   ───────────────────────────────────────────── */
async function loadTemplate(cacheDir) {
  if (templateCache) return templateCache;

  const file = path.join(cacheDir, "left_template.jpg");
  if (fs.existsSync(file)) {
    try {
      templateCache = await loadImage(file);
      return templateCache;
    } catch (_) {
      try { fs.unlinkSync(file); } catch (_) {}
    }
  }

  const res = await axios.get(TEMPLATE_URL, {
    responseType: "arraybuffer",
    timeout: 20000
  });
  fs.writeFileSync(file, Buffer.from(res.data));
  templateCache = await loadImage(file);
  return templateCache;
}

/* ─────────────────────────────────────────────
   Avatar loader
   ───────────────────────────────────────────── */
async function loadAvatar(uid) {
  const urls = [
    `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=${TOKEN}`,
    `https://graph.facebook.com/${uid}/picture?type=large&access_token=${TOKEN}`,
    `https://graph.facebook.com/${uid}/picture?width=512&height=512`,
    `https://graph.facebook.com/${uid}/picture?type=large`
  ];
  for (const url of urls) {
    try {
      const img = await loadImage(url);
      if (img && img.width >= 80) return img;
    } catch (_) {}
  }
  return null;
}

/* ─────────────────────────────────────────────
   Image Generator
   ───────────────────────────────────────────── */
async function makeImage(targetID) {
  const cacheDir = path.join(__dirname, "cache");
  fs.ensureDirSync(cacheDir);
  const outPath = path.join(cacheDir, `left_${targetID}_${Date.now()}.png`);

  const [base, avatar] = await Promise.all([
    loadTemplate(cacheDir),
    loadAvatar(targetID)
  ]);
  if (!avatar) throw new Error("avatar");

  const W = base.width;
  const H = base.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(base, 0, 0, W, H);

  const size = Math.floor(W * POS.size);
  const cx = Math.floor(W * POS.x);
  const cy = Math.floor(H * POS.y);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();

  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  return outPath;
}

/* Consecutive lines repeat na ho */
function pickLine() {
  let i;
  do {
    i = Math.floor(Math.random() * FUNNY_LINES.length);
  } while (FUNNY_LINES.length > 1 && i === lastLineIndex);
  lastLineIndex = i;
  return FUNNY_LINES[i];
}

/* ══════════════════════════════════════════════════════════════
   🚀 COMMAND
   ══════════════════════════════════════════════════════════════ */
module.exports = {
  config: {
    name: "left",
    version: "1.1.0",
    author: "TAHA KHAN",
    countDown: 5,
    role: 0,
    shortDescription: { en: "RIP tombstone when a member leaves gc" },
    longDescription: { en: "Puts the replied or tagged person's profile picture on the RIP tombstone. Also runs automatically when someone leaves the group." },
    category: "fun",
    guide: { en: "{pn} (reply to someone | @mention)" }
  },

  /* ─── Manual Command (Reply ya Tag kar ke) ─── */
  onStart: async function ({ api, event, message }) {
    const { messageID, mentions, messageReply } = event;

    let targetID = null;
    if (messageReply && messageReply.senderID) {
      targetID = messageReply.senderID;
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    }

    if (!targetID) {
      await react(api, "❌", messageID);
      return;
    }

    react(api, "⏳", messageID);

    let outPath = null;
    try {
      outPath = await makeImage(targetID);
      await message.reply(
        { attachment: fs.createReadStream(outPath) },
        () => { try { fs.unlinkSync(outPath); } catch (_) {} }
      );
      await react(api, "✅", messageID);
    } catch (e) {
      try { if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
      await react(api, "❌", messageID);
    }
  },

  /* ─── Auto Event (Jab koi group chor kar jaye) ─── */
  onEvent: async function ({ api, event, message, usersData }) {
    if (event.logMessageType !== "log:unsubscribe") return;

    const leftID = String(event.logMessageData?.leftParticipantFbId || "");
    if (!leftID) return;

    /* Bot khud left ho ya bot ko nikala jaye toh kuch na kare */
    let botID = "";
    try { botID = String(api.getCurrentUserID()); } catch (_) {}
    if (leftID === botID) return;

    /* Kick check */
    const kicked = String(event.author) !== leftID;
    if (kicked && !INCLUDE_KICKED) return;

    /* Duplicate events rokne ke liye */
    const key = `${event.threadID}_${leftID}`;
    const now = Date.now();
    if (recentLeaves.has(key) && now - recentLeaves.get(key) < 15000) return;
    recentLeaves.set(key, now);
    for (const [k, t] of recentLeaves) {
      if (now - t > 60000) recentLeaves.delete(k);
    }

    let outPath = null;
    try {
      let name = leftID;
      try { name = (await usersData.getName(leftID)) || leftID; } catch (_) {}
      const tag = `@${name}`;
      const body = pickLine().replace(/\{name\}/g, tag);

      outPath = await makeImage(leftID);
      await message.send(
        {
          body,
          mentions: [{ id: leftID, tag }],
          attachment: fs.createReadStream(outPath)
        },
        () => { try { fs.unlinkSync(outPath); } catch (_) {} }
      );
    } catch (e) {
      try { if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
    }
  }
};