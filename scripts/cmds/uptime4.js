const { createCanvas } = require("canvas");
const fs = require("fs");
const os = require("os");
const path = require("path");

module.exports = {
  config: {
    name: "uptime4",
    aliases: ["up4"],
    version: "3.3",
    author: "Siam Ahmed Saan",
    role: 0,
    shortDescription: { en: "Cyberpunk gamer uptime card" },
    longDescription: {
      en: "Sends uptime and system info as a neon cyberpunk-style card image."
    },
    category: "system",
    guide: { en: "{p}up2" }
  },

  onStart: async function ({ api, event }) {
    try {
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const uptimeFormatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      const memoryUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
      const now = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Dhaka",
        hour12: true
      });
      const [date, time] = now.split(", ");

      // Canvas size
      const width = 900;
      const height = 600;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Futuristic neon background
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#0f0c29");
      gradient.addColorStop(0.5, "#302b63");
      gradient.addColorStop(1, "#24243e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Neon glowing card
      const cardX = 60;
      const cardY = 70;
      const cardW = width - 120;
      const cardH = height - 160;
      ctx.fillStyle = "rgba(10, 10, 20, 0.75)";
      ctx.strokeStyle = "#00fff7";
      ctx.lineWidth = 5;
      ctx.shadowColor = "#00fff7";
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 25);
      ctx.fill();
      ctx.stroke();

      // Title with neon pink + techno font
      ctx.font = "bold 42px Impact, Orbitron, sans-serif";
      ctx.fillStyle = "#ff2fd0";
      ctx.textAlign = "center";
      ctx.shadowColor = "#ff2fd0";
      ctx.shadowBlur = 20;
      ctx.fillText("⚡ BOT UPTIME STATS ⚡", width / 2, 130);

      // Info lines with cyan glow + monospace font
      ctx.font = "26px Consolas, Lucida Console, monospace";
      ctx.fillStyle = "#00fff7";
      ctx.shadowColor = "#00fff7";
      ctx.shadowBlur = 15;

      const lines = [
        `🕰️ Uptime: ${uptimeFormatted}`,
        `🕓 Time: ${time}`,
        `📆 Date: ${date}`,
        `💾 RAM Usage: ${memoryUsage} MB`,
        `🖥️ OS: ${os.platform()} (${os.arch()})`,
        `🛠️ Node: ${process.version}`
      ];

      let y = 200;
      for (const line of lines) {
        ctx.fillText(line, width / 2, y);
        y += 55;
      }

      // Signature with stylish font
      ctx.font = "bold 24px 'Brush Script MT', 'Comic Sans MS', cursive";
      ctx.fillStyle = "#ff00ff";
      ctx.textAlign = "right";
      ctx.shadowColor = "#ff00ff";
      ctx.shadowBlur = 25;
      ctx.fillText("©Saan Exhausted", width - 80, height - 40);

      // Save + send
      const outPath = path.join(__dirname, "uptime-cyberpunk.png");
      const out = fs.createWriteStream(outPath);
      const stream = canvas.createPNGStream();
      stream.pipe(out);

      out.on("finish", () => {
        api.sendMessage(
          {
            body: "⚡saan 𝚄𝚙𝚝𝚒𝚖𝚎 𝙸𝚗𝚏𝚘:",
            attachment: fs.createReadStream(outPath)
          },
          event.threadID,
          () => fs.unlinkSync(outPath)
        );
      });

    } catch (err) {
      console.error("Uptime card error:", err.message);
      api.sendMessage("❌ Could not generate uptime card.", event.threadID);
    }
  }
};
