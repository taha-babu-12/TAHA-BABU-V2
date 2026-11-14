const { getTime } = global.utils;
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require('canvas');

try {
    registerFont(path.join(__dirname, 'fonts', 'NotoNastaliqUrdu-Bold.ttf'), { family: 'UrduFont' });
} catch (e) {}

const TEMPLATE_PATH = path.join(__dirname, 'assets', 'welcome_bg.jpg');

// 🔥 3D TEXT DRAWING FUNCTION
function draw3DText(ctx, text, x, y, fontSize, color, strokeColor, maxWidth) {
    const font = `bold ${fontSize}px "Arial Black", Arial, sans-serif`;
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Deep Black Shadow (3D Effect)
    ctx.fillStyle = '#000000'; 
    for (let i = 1; i <= Math.ceil(fontSize * 0.1); i++) {
        ctx.fillText(text, x + i, y + i, maxWidth);
    }
    
    // 2. Colored Stroke (Border)
    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.ceil(fontSize * 0.08);
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y, maxWidth);
    }

    // 3. Main Fill Color
    ctx.fillStyle = color;
    ctx.fillText(text, x, y, maxWidth);

    // 4. White Highlight (Top Edge)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(text, x - 1, y - 1, maxWidth);

    ctx.restore();
}

async function createWelcomeCard(groupImg, userImg, groupName, userName, memberCount, adderName) {
    let bgImg;
    try {
        bgImg = await loadImage(TEMPLATE_PATH);
    } catch (e) {
        console.log("Template nahi mila assets folder me.");
        return null;
    }

    const width = bgImg.width; 
    const height = bgImg.height; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(bgImg, 0, 0, width, height);

    // 🔥 DP Download (With Anti-Cache)
    const drawCircleImage = async (imgUrl, cx, cy, radius) => {
        try {
            const res = await axios.get(imgUrl, { 
                responseType: 'arraybuffer',
                headers: { "User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache" }
            });
            const img = await loadImage(Buffer.from(res.data));
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
            ctx.restore();
        } catch (e) {}
    };

    // 🔥 PICTURES POSITIONS (Y ko 435 se 470 kar diya hai taake neeche aaye)
    await drawCircleImage(groupImg, 255, 470, 162.5); // Left (Group)
    await drawCircleImage(userImg, 1415, 470, 162.5); // Right (User)

    // 🔥 TEXT POSITIONS
    const titleFontSize = Math.floor(width * 0.045); 

    // Left Box: Group Name
    let finalGroupName = groupName.toUpperCase();
    draw3DText(ctx, finalGroupName, 255, 745, titleFontSize, '#ffffff', '#00f2fe', 400);

    // Right Box: User Name
    draw3DText(ctx, userName, 1415, 745, titleFontSize, '#ffffff', '#f093fb', 400);

    // 🔥 Center Top Box: Member Count (Thoda adjust kiya hai)
    draw3DText(ctx, `${memberCount} MEMBERS`, 836, 530, titleFontSize, '#ffffff', '#00f2fe', 450);

    // Center Bottom Box: Adder Name 
    let finalAdderName = adderName.toUpperCase();
    draw3DText(ctx, finalAdderName, 836, 725, titleFontSize, '#ffffff', '#f093fb', 450);

    return canvas.toBuffer();
}

module.exports = {
    config: {
        name: "welcome",
        version: "9.4.0",
        author: "TAHA KHAN",
        category: "events"
    },
    langs: {
        en: {
            welcomeMessage: "『 ᴛʜᴀɴᴋ ʏᴏᴜ ꜰᴏʀ ᴀᴅᴅɪɴɢ ᴍᴇ! 』",
            defaultWelcomeMessage: "『 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛʜᴇ ᴄʟᴀɴ 』\n━━━━━━━━━━━━━━━━━━\n👋 ʜᴇʟʟᴏ, {userNameTag}!\n🏘️ ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ: {boxName}"
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

        if (!global.temp.welcomeQueue) global.temp.welcomeQueue = {};
        if (!global.temp.welcomeQueue[threadID]) global.temp.welcomeQueue[threadID] = { users: [], timeout: null };

        for (const user of dataAddedParticipants) {
            if (!global.temp.welcomeQueue[threadID].users.find(u => u.userFbId === user.userFbId)) {
                global.temp.welcomeQueue[threadID].users.push(user);
            }
        }

        clearTimeout(global.temp.welcomeQueue[threadID].timeout);

        global.temp.welcomeQueue[threadID].timeout = setTimeout(async () => {
            const usersToWelcome = global.temp.welcomeQueue[threadID].users;
            delete global.temp.welcomeQueue[threadID];

            const threadData = await threadsData.get(threadID);
            if (threadData.settings.sendWelcomeMessage == false) return;

            const threadName = threadData.threadName || "GROUP";
            const adderID = event.author;
            let adderName = await usersData.getName(adderID) || "Unknown";
            let memberCount = threadData.members?.length || 1;
            let groupImg = threadData.imageSrc || `https://graph.facebook.com/${threadID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            let { welcomeMessage = getLang("defaultWelcomeMessage") } = threadData.data;

            for (const user of usersToWelcome) {
                try {
                    let userAvatar = await usersData.getAvatarUrl(user.userFbId);
                    
                    let personalizedMessage = welcomeMessage
                        .replace(/\{userNameTag\}|\{userName\}/g, user.fullName)
                        .replace(/\{boxName\}|\{threadName\}/g, threadName);

                    const imageBuffer = await createWelcomeCard(
                        groupImg, userAvatar, threadName, user.fullName, memberCount, adderName
                    );

                    if (!imageBuffer) continue;

                    const tempDir = path.join(__dirname, 'cache');
                    await fs.ensureDir(tempDir);
                    const tempPath = path.join(tempDir, `welcome_${user.userFbId}_${Date.now()}.png`);
                    fs.writeFileSync(tempPath, imageBuffer);

                    await message.send({
                        body: personalizedMessage,
                        attachment: fs.createReadStream(tempPath),
                        mentions: [{ tag: user.fullName, id: user.userFbId }]
                    });

                    setTimeout(() => { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); }, 10000);
                    
                    await new Promise(r => setTimeout(r, 2000));

                } catch (error) {
                    console.error(`[WELCOME] Error for user ${user.userFbId}:`, error);
                }
            }
        }, 1500);
    }
};
