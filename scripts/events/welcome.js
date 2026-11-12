const { getTime } = global.utils;
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require('canvas');

if (!global.temp.welcomeEvent)
    global.temp.welcomeEvent = {};

// 🌌 Background Image URL (Agar aapke paas koi aur galaxy ki pic hai to yahan change kar lena)
const GALAXY_BG = "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2048&auto=format&fit=crop";

async function createWelcomeCard(userImg, botImg, userName, userNumber, threadName) {
    const width = 1024;
    const height = 450;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Galaxy Background Load karo
    try {
        const bgRes = await axios.get(GALAXY_BG, { responseType: 'arraybuffer' });
        const bgImg = await loadImage(Buffer.from(bgRes.data));
        ctx.drawImage(bgImg, 0, 0, width, height);
    } catch (e) {
        ctx.fillStyle = "#0a0a10";
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Right side ka Dark Angled Panel
    ctx.fillStyle = "#18181b"; // Dark Charcoal
    ctx.beginPath();
    ctx.moveTo(width * 0.45, 0);      // Top point (angled)
    ctx.lineTo(width, 0);             // Top right
    ctx.lineTo(width, height);        // Bottom right
    ctx.lineTo(width * 0.25, height); // Bottom point (angled)
    ctx.closePath();
    ctx.fill();

    // Ek halki si border line taake panel alag lage
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.45, 0);
    ctx.lineTo(width * 0.25, height);
    ctx.stroke();

    // 3. Left side Name Badge (Polygon)
    ctx.fillStyle = "#18181b";
    ctx.beginPath();
    ctx.moveTo(0, height - 90);
    ctx.lineTo(width * 0.3, height - 90);
    ctx.lineTo(width * 0.35, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Badge ki white outline
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height - 90);
    ctx.lineTo(width * 0.3, height - 90);
    ctx.lineTo(width * 0.35, height);
    ctx.stroke();

    // 4. Left Avatar (User) Draw karo
    try {
        const res = await axios.get(userImg, { responseType: 'arraybuffer' });
        const img = await loadImage(Buffer.from(res.data));
        
        const cx = 180;
        const cy = 160;
        const r = 110;

        // Black Border
        ctx.beginPath();
        ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();

        // Inner Grey Border
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = "#333";
        ctx.fill();

        // Avatar Clip
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
    } catch (e) { console.log("User Avatar error"); }

    // 5. Right Avatar (Bot/Group) Draw karo
    try {
        const res = await axios.get(botImg, { responseType: 'arraybuffer' });
        const img = await loadImage(Buffer.from(res.data));
        
        const cx = 850;
        const cy = 310;
        const r = 70;

        // Black Border
        ctx.beginPath();
        ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();

        // Inner Border
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = "#333";
        ctx.fill();

        // Avatar Clip
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
    } catch (e) { console.log("Bot Avatar error"); }

    // 6. Text: WELCOME TO (Angled)
    ctx.save();
    ctx.translate(750, 180); // Position
    ctx.rotate(35 * Math.PI / 180); // Angle (35 degrees)
    ctx.font = 'bold 55px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText("WELCOME TO", 0, 0);
    ctx.restore();

    // 7. Text: GROUP NAME (Right Side)
    ctx.font = 'bold 50px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    
    // Agar naam bohot lamba hai to kaat do
    let gName = threadName.toUpperCase();
    if (gName.length > 15) gName = gName.substring(0, 14) + "...";
    ctx.fillText(gName, 810, 420);

    // 8. Text: USER NAME (Left Side)
    ctx.font = 'bold 55px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    
    let uName = userName.toUpperCase();
    if (uName.length > 12) uName = uName.substring(0, 11) + "...";
    ctx.fillText(uName, 30, height - 110);

    // 9. Text: MEMBER COUNT (Left Side)
    ctx.font = 'bold 22px "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`- ${userNumber}TH MEMBER !`, 30, height - 40);

    return canvas.toBuffer();
}

module.exports = {
    config: {
        name: "welcome",
        version: "5.0.0",
        author: "xalman",
        category: "events"
    },
    langs: {
        en: {
            session1: "morning", session2: "noon", session3: "afternoon", session4: "evening",
            welcomeMessage: "『 ᴛʜᴀɴᴋ ʏᴏᴜ ꜰᴏʀ ᴀᴅᴅɪɴɢ ᴍᴇ! 』",
            defaultWelcomeMessage: "『 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛʜᴇ ᴄʟᴀɴ 』\n━━━━━━━━━━━━━━━━━━\n👋 ʜᴇʟʟᴏ, {userNameTag}!\n🏘️ ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ: {boxName}\n🕒 ʜᴀᴠᴇ ᴀ ɢᴏᴏᴅ {session}"
        }
    },

    onStart: async ({ threadsData, message, event, api, getLang, usersData }) => {
        if (event.logMessageType !== "log:subscribe") return;

        const hours = getTime("HH");
        const { threadID } = event;
        const prefix = global.utils.getPrefix(threadID);
        const dataAddedParticipants = event.logMessageData.addedParticipants;

        // Agar bot ko add kiya gaya
        if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
            if (global.GoatBot.config.nickNameBot)
                api.changeNickname(global.GoatBot.config.nickNameBot, threadID, api.getCurrentUserID());
            return message.send(getLang("welcomeMessage", prefix));
        }

        if (!global.temp.welcomeEvent[threadID])
            global.temp.welcomeEvent[threadID] = { joinTimeout: null, dataAddedParticipants: [] };

        global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);
        clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

        global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async function () {
            const threadData = await threadsData.get(threadID);
            if (threadData.settings.sendWelcomeMessage == false) return;

            const addedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
            const threadName = threadData.threadName || "GROUP";
            let userName = [], mentions = [];

            for (const user of addedParticipants) {
                userName.push(user.fullName);
                mentions.push({ tag: user.fullName, id: user.userFbId });
            }

            if (userName.length == 0) return;

            let { welcomeMessage = getLang("defaultWelcomeMessage") } = threadData.data;
            welcomeMessage = welcomeMessage
                .replace(/\{userNameTag\}|\{userName\}/g, userName.join(", "))
                .replace(/\{boxName\}|\{threadName\}/g, threadName);

            try {
                const firstUser = addedParticipants[0];
                
                // Avatars fetch karo
                let userAvatar = await usersData.getAvatarUrl(firstUser.userFbId);
                let botAvatar = `https://graph.facebook.com/${api.getCurrentUserID()}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
                let memberCount = threadData.members?.length || 1;

                // 🔥 Image Generate karo
                const imageBuffer = await createWelcomeCard(
                    userAvatar,
                    botAvatar,
                    firstUser.fullName,
                    memberCount,
                    threadName
                );

                const tempDir = path.join(__dirname, 'cache');
                await fs.ensureDir(tempDir);
                const tempPath = path.join(tempDir, `welcome_${Date.now()}.png`);
                fs.writeFileSync(tempPath, imageBuffer);

                await message.send({
                    body: welcomeMessage,
                    attachment: fs.createReadStream(tempPath),
                    mentions: mentions
                });

                setTimeout(() => { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); }, 10000);

            } catch (error) {
                console.error("[WELCOME] Card creation error:", error);
                await message.send({ body: welcomeMessage, mentions: mentions });
            }

            delete global.temp.welcomeEvent[threadID];
        }, 400);
    }
};
