const axios = require("axios");

module.exports = {
  config: {
    name: "rizz",
    aliases: ["flirt", "roast", "shayari", "motivate", "compliment"],
    version: "3.1.0",
    author: "TAHA KHAN",
    countDown: 3,
    role: 0,
    category: "fun",
    description: { en: "Stylish AI Rizz", ur: "Stylish AI Rizz" },
    guide: { en: "{pn} [rizz/roast/compliment/shayari/motivate] <name>", ur: "{pn} <command> <name>" }
  },

  // 🔥 Naya API URL
  AI_BASE_URL: "https://taha-ai-api-uav2.onrender.com",
  BACKUP_AI_BASE_URL: "https://taha-ai-api-64i8.onrender.com", // Purani API backup ke liye
  AI_MODEL: "gemini-3.5-flash",

  sendMsg(api, content, threadID, messageID) {
    return new Promise((resolve) => {
      api.sendMessage(content, threadID, (err, info) => resolve(info), messageID);
    });
  },

  // 🎨 Stylish Text Generator (Fancy Fonts)
  styleText(text, type) {
    const fonts = {
      bold: { a: "𝐚", b: "𝐛", c: "𝐜", d: "𝐝", e: "𝐞", f: "𝐟", g: "𝐠", h: "𝐡", i: "𝐢", j: "𝐣", k: "𝐤", l: "𝐥", m: "𝐦", n: "𝐧", o: "𝐨", p: "𝐩", q: "𝐪", r: "𝐫", s: "𝐬", t: "𝐭", u: "𝐮", v: "𝐯", w: "𝐰", x: "𝐱", y: "𝐲", z: "𝐳", A: "𝐀", B: "𝐁", C: "𝐂", D: "𝐃", E: "𝐄", F: "𝐅", G: "𝐆", H: "𝐇", I: "𝐈", J: "𝐉", K: "𝐊", L: "𝐋", M: "𝐌", N: "𝐍", O: "𝐎", P: "𝐏", Q: "𝐐", R: "𝐑", S: "𝐒", T: "𝐓", U: "𝐔", V: "𝐕", W: "𝐖", X: "𝐗", Y: "𝐘", Z: "𝐙" },
      italic: { a: "𝑎", b: "𝑏", c: "𝑐", d: "𝑑", e: "𝑒", f: "𝑓", g: "𝑔", h: "ℎ", i: "𝑖", j: "𝑗", k: "𝑘", l: "𝑙", m: "𝑚", n: "𝑛", o: "𝑜", p: "𝑝", q: "𝑞", r: "𝑟", s: "𝑠", t: "𝑡", u: "𝑢", v: "𝑣", w: "𝑤", x: "𝑥", y: "𝑦", z: "𝑧", A: "𝐴", B: "𝐵", C: "𝐶", D: "𝐷", E: "𝐸", F: "𝐹", G: "𝐺", H: "𝐻", I: "𝐼", J: "𝐽", K: "𝐾", L: "𝐿", M: "𝑀", N: "𝑁", O: "𝑂", P: "𝑃", Q: "𝑄", R: "𝑅", S: "𝑆", T: "𝑇", U: "𝑈", V: "𝑉", W: "𝑊", X: "𝑋", Y: "𝑌", Z: "𝑍" },
      monospace: { a: "𝚊", b: "𝚋", c: "𝚌", d: "𝚍", e: "𝚎", f: "𝚏", g: "𝚐", h: "𝚑", i: "𝚒", j: "𝚓", k: "𝚔", l: "𝚕", m: "𝚖", n: "𝚗", o: "𝚘", p: "𝚙", q: "𝚚", r: "𝚛", s: "𝚜", t: "𝚝", u: "𝚞", v: "𝚟", w: "𝚠", x: "𝚡", y: "𝚢", z: "𝚣", A: "𝙰", B: "𝙱", C: "𝙲", D: "𝙳", E: "𝙴", F: "𝙵", G: "𝙶", H: "𝙷", I: "𝙸", J: "𝙹", K: "𝙺", L: "𝙻", M: "𝙼", N: "𝙽", O: "𝙾", P: "𝙿", Q: "𝚀", R: "𝚁", S: "𝚂", T: "𝚃", U: "𝚄", V: "𝚅", W: "𝚆", X: "𝚇", Y: "𝚈", Z: "𝚉" },
      script: { a: "𝓪", b: "𝓫", c: "𝓬", d: "𝓭", e: "𝓮", f: "𝓯", g: "𝓰", h: "𝓱", i: "𝓲", j: "𝓳", k: "𝓴", l: "𝓵", m: "𝓶", n: "𝓷", o: "𝓸", p: "𝓹", q: "𝓺", r: "𝓻", s: "𝓼", t: "𝓽", u: "𝓾", v: "𝓿", w: "𝔀", x: "𝔁", y: "𝔂", z: "𝔃", A: "𝓐", B: "𝓑", C: "𝓒", D: "𝓓", E: "𝓔", F: "𝓕", G: "𝓖", H: "𝓗", I: "𝓘", J: "𝓙", K: "𝓚", L: "𝓛", M: "𝓜", N: "𝓝", O: "𝓞", P: "𝓟", Q: "𝓠", R: "𝓡", S: "𝓢", T: "𝓣", U: "𝓤", V: "𝓥", W: "𝓦", X: "𝓧", Y: "𝓨", Z: "𝓩" }
    };
    const map = fonts[type] || fonts.bold;
    return String(text).split("").map(c => map[c] || c).join("");
  },

  extractReply(data) {
    if (!data) return null;
    if (typeof data === "string" && data.length > 5) return data;
    if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    if (data.response) return data.response;
    if (data.text) return data.text;
    if (data.result) return data.result;
    return null;
  },

  // 🔥 NAYA askAI (Naya API + Purana Backup)
  async askAI(prompt) {
    const apis = [
      { url: this.AI_BASE_URL, name: "Naya API" },
      { url: this.BACKUP_AI_BASE_URL, name: "Purani API" }
    ];

    for (const api of apis) {
      const endpoints = ["/v1/chat/completions", "/api/chat", "/gemini"];
      for (const endpoint of endpoints) {
        try {
          const res = await axios.post(api.url + endpoint, {
            model: this.AI_MODEL,
            messages: [{ role: "user", content: prompt }]
          }, { timeout: 90000 }); 
          const txt = this.extractReply(res.data);
          if (txt) return txt.trim();
        } catch (e) {}
      }
    }
    return null;
  },

  async getUserName(api, usersData, userId) {
    try {
      if (usersData && usersData.getName) {
        const name = await usersData.getName(userId);
        if (name) return name;
      }
    } catch (e) {}
    return "Bhai";
  },

  async onStart({ api, event, args, message, usersData }) {
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;
    
    const body = event.body || "";
    const prefix = global.GoatBot?.config?.prefix || ".";
    const cmdRaw = body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();

    const mode = ["rizz", "flirt", "roast", "shayari", "motivate", "compliment"].includes(cmdRaw) ? cmdRaw : "rizz";
    let targetName = args.join(" ").trim();

    if (mode === "roast" || mode === "compliment" || mode === "rizz" || mode === "flirt") {
      if (Object.keys(mentions).length > 0) {
        targetName = await this.getUserName(api, usersData, Object.keys(mentions)[0]);
      } else if (type === "message_reply") {
        targetName = await this.getUserName(api, usersData, messageReply.senderID);
      }
    }
    if (!targetName) targetName = "Bhai";

    if (api.setMessageReaction) api.setMessageReaction("✨", messageID, () => {}, true);

    let prompt = "";
    if (mode === "rizz" || mode === "flirt") {
      prompt = `Write a very creative, smooth, and funny pickup line for a person named "${targetName}". Language: Roman Urdu or English. Max 2 lines. Use 1-2 emojis. Reply ONLY with the pickup line, nothing else.`;
    } else if (mode === "roast") {
      prompt = `Write a savage, funny roast for a person named "${targetName}". Language: Roman Urdu. Keep it playful, not vulgar. Max 2 lines. Use 1-2 emojis. Reply ONLY with the roast, nothing else.`;
    } else if (mode === "compliment") {
      prompt = `Write a beautiful, heart-touching compliment for a person named "${targetName}". Language: Roman Urdu. Max 2 lines. Use 1-2 emojis. Reply ONLY with the compliment, nothing else.`;
    } else if (mode === "shayari") {
      prompt = `Write a deep, romantic 4-line Urdu shayari in Roman Urdu about love. Use 2-3 emojis. Reply ONLY with the shayari, nothing else.`;
    } else if (mode === "motivate") {
      prompt = `Write a powerful, life-changing motivational quote in Roman Urdu. Max 2 lines. Use 1-2 emojis. Reply ONLY with the quote, nothing else.`;
    }

    try {
      const aiReply = await this.askAI(prompt);
      if (!aiReply) throw new Error("API fail");

      let finalResult = "";
      
      // 🎨 AESTHETIC DESIGN
      if (mode === "rizz" || mode === "flirt") {
        const title = this.styleText("Rizz King", "bold");
        const target = this.styleText(targetName, "script");
        finalResult = 
          `╭───────────────────────╮\n` +
          `      💘 ${title} 💘\n` +
          `╰───────────────────────╯\n\n` +
          `👤 ${this.styleText("Target", "italic")} : ${target}\n\n` +
          `💬 "${aiReply}"\n\n` +
          `┏━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
          `   ⚡ ${this.styleText("TAHA KHAN", "bold")} ⚡\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━━━┛`;
      } 
      else if (mode === "roast") {
        const title = this.styleText("Roast Master", "bold");
        const target = this.styleText(targetName, "script");
        finalResult = 
          `╭───────────────────────╮\n` +
          `      🔥 ${title} 🔥\n` +
          `╰───────────────────────╯\n\n` +
          `🎯 ${this.styleText("Victim", "italic")} : ${target}\n\n` +
          `🗣️ ${aiReply}\n\n` +
          `┏━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
          `   ⚡ ${this.styleText("TAHA KHAN", "bold")} ⚡\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━━━┛`;
      } 
      else if (mode === "compliment") {
        const title = this.styleText("Compliment", "bold");
        const target = this.styleText(targetName, "script");
        finalResult = 
          `╭───────────────────────╮\n` +
          `      💕 ${title} 💕\n` +
          `╰───────────────────────╯\n\n` +
          `✨ ${this.styleText("To", "italic")} : ${target}\n\n` +
          `🌸 ${aiReply}\n\n` +
          `┏━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
          `   ⚡ ${this.styleText("TAHA KHAN", "bold")} ⚡\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━━━┛`;
      } 
      else if (mode === "shayari") {
        const title = this.styleText("Shayari", "bold");
        finalResult = 
          `╭───────────────────────╮\n` +
          `      📝 ${title} 📝\n` +
          `╰───────────────────────╯\n\n` +
          `${aiReply}\n\n` +
          `┏━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
          `   ⚡ ${this.styleText("TAHA KHAN", "bold")} ⚡\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━━━┛`;
      } 
      else if (mode === "motivate") {
        const title = this.styleText("Motivation", "bold");
        finalResult = 
          `╭───────────────────────╮\n` +
          `      🚀 ${title} 🚀\n` +
          `╰───────────────────────╯\n\n` +
          `${aiReply}\n\n` +
          `┏━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
          `   ⚡ ${this.styleText("TAHA KHAN", "bold")} ⚡\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━━━┛`;
      }

      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);
      return this.sendMsg(api, finalResult, threadID, messageID);

    } catch (err) {
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return this.sendMsg(api, `❌ Bhai API down hai, abhi nayi line nahi bana sakta.`, threadID, messageID);
    }
  }
};
