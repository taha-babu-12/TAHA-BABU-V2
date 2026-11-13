const { getTime } = global.utils;
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require('canvas');

if (!global.temp.welcomeEvent)
    global.temp.welcomeEvent = {};

// 🔥 Urdu Font Register Karo (Agar font file download ki hai to)
try {
    registerFont(path.join(__dirname, 'fonts', 'NotoNastaliqUrdu-Bold.ttf'), { family: 'UrduFont' });
} catch (e) {
    console.log("[WELCOME] Urdu font not found. Using default.");
}

// 🔥 Background Image ka Path
const TEMPLATE_PATH = path.join(__dirname, 'assets', 'welcome_bg.jpg');

async function createWelcomeCard(groupImg, userImg, groupName, userName, memberCount, adderName) {
    const width = 1672; // Aapki image ka exact size
    const height = 939;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background Template Load Karo
    try {
        const bgImg = await loadImage(TEMPLATE_PATH);
        ctx.drawImage(bgImg, 0, 0, width, height);
    } catch (e) {
        console.log("Template not found at: " + TEMPLATE_PATH);
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Function: Gol (Circular) Image Draw Karne Ke Liye
    const drawCircleImage = async (imgUrl, cx, cy, radius) => {
        try {
            const res = await axios.get(imgUrl, { responseType: 'arraybuffer' });
            const img = await loadImage(Buffer.from(res.data));
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
            ctx.restore();
        } catch (e) {
            // Agar image load na ho to kuch mat karo
        }
    };

    // 3. Left Circle (Group DP) -> Coordinates: X: 255, Y: 400, R: 200
    await drawCircleImage(groupImg, 255, 400, 200);

    // 4. Right Circle (User DP) -> Coordinates: X: 1415, Y: 400, R: 200
    await drawCircleImage(userImg, 1415, 400, 200);

    // 5. Text Style Setup
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 10;
    
    // 6. Left Box Text (Group Name) -> X: 255, Y: 700
    ctx.font = 'bold 55px "Arial Black", Arial, sans-serif'; // English font
    ctx.fillStyle = '#ffffff';
    
    let finalGroupName = groupName.toUpperCase();
    if(finalGroupName.length > 15) finalGroupName = finalGroupName.substring(0, 14) + "...";
    
    ctx.fillText(finalGroupName, 255, 700);

    // 7. Right Box Text (User Name) -> X: 1415, Y: 700
    // Urdu font use kar rahe hain yahan
    ctx.font = 'bold 60px "UrduFont", "Arial Black", Arial, sans-serif'; 
    ctx.fillStyle = '#ffffff';
    
    let finalUserName = userName;
    if(finalUserName.length > 15) finalUserName = finalUserName.substring(0, 14) + "...";
    
    ctx.fillText(finalUserName, 1415, 700);

    // 8. Center Top Box Text (Member Count) -> X: 836, Y: 465
    ctx.font = 'bold 50px "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${memberCount} MEMBERS`, 836, 465);

    // 9. Center Bottom Box Text (Added By) -> X: 836, Y: 650
    // Adder ka naam
    ctx.font = 'bold 50px "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    
    let finalAdderName = adderName.toUpperCase();
    if(finalAdderName.length > 18) finalAdderName = finalAdderName.substring(0, 17) + "...";
    
    ctx.fillText(finalAdderName, 836, 650);

    return canvas.toBuffer();
}

module.exports = {
    config: {
        name: "welcome",
        version: "6.0.0",
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

        const { threadID } = event;
        const prefix = global.utils.getPrefix(threadID);
        const dataAddedParticipants = event.logMessageData.addedParticipants;

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
                const adderID = event.author;

                let groupImg = threadData.imageSrc || `https://graph.facebook.com/${threadID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
                let userAvatar = await usersData.getAvatarUrl(firstUser.userFbId);
                let adderName = await usersData.getName(adderID) || "Unknown";
                let memberCount = threadData.members?.length || 1;

                // 🔥 Image Generate karo
                const imageBuffer = await createWelcomeCard(
                    groupImg,
                    userAvatar,
                    threadName,
                    firstUser.fullName,
                    memberCount,
                    adderName
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
