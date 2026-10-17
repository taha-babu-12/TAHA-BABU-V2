const fs = require("fs");
const { downloadVideo } = require("sagor-video-downloader");

module.exports = {
    config: {
        name: "autolink",
        version: "2.0.0",
        author: "𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍",
        countDown: 5,
        role: 0,
        shortDescription: "Auto-download & send videos",
        category: "media",
    },

    onStart: async function () {},

    onChat: async function ({ api, event }) {
        const threadID = event.threadID;
        const message = event.body || "";

        const linkMatches = message.match(/(https?:\/\/[^\s]+)/g);
        if (!linkMatches || linkMatches.length === 0) return;

        const uniqueLinks = [...new Set(linkMatches)];

        for (const url of uniqueLinks) {
            let filePath = null;

            try {
                const result = await downloadVideo(url);

                filePath = result.filePath;

                if (!filePath || !fs.existsSync(filePath)) {
                    throw new Error("Video file not found");
                }

                const stats = fs.statSync(filePath);
                const fileSizeInMB = stats.size / (1024 * 1024);

                if (fileSizeInMB > 25) {
                    fs.unlinkSync(filePath);
                    filePath = null;
                    continue;
                }

                await api.sendMessage(
                    {
                        body:
`🎞️ 𝐇𝐞𝐫𝐞'𝐬 𝐘𝐨𝐮𝐫 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝𝐞𝐝 𝐕𝐢𝐝𝐞𝐨 ✨
𓆩♡𓆪 𝐄𝐧𝐣𝐨𝐲 𝐖𝐚𝐭𝐜𝐡𝐢𝐧𝐠! 🎬
    👑 𝐁𝐨𝐭 𝐨𝐰𝐧𝐞𝐫 » ✰𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 💫🪽`,
                        attachment: fs.createReadStream(filePath)
                    },
                    threadID,
                    () => {
                        if (filePath && fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                );

            } catch (error) {
                if (filePath && fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch {}
                }
            }
        }
    }
};
