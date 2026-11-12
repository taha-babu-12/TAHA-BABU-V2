
'use strict';

const { getTime } = global.utils;
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

if (!global.temp.welcomeEvent) global.temp.welcomeEvent = {};

const GALAXY_BG = 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2048&auto=format&fit=crop';
const PURPLE = '#a855f7';

async function loadRemoteImage(url) {
    if (!url) return null;
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 12000,
            maxContentLength: 8 * 1024 * 1024
        });
        return await loadImage(Buffer.from(response.data));
    } catch (error) {
        console.log('[WELCOME] Image load failed:', error.message);
        return null;
    }
}

function fitText(ctx, text, maxWidth, startSize, minSize = 18) {
    let size = startSize;
    while (size > minSize) {
        ctx.font = `900 ${size}px Arial`;
        if (ctx.measureText(text).width <= maxWidth) break;
        size -= 2;
    }
    return size;
}

function drawCover(ctx, image, x, y, width, height) {
    const scale = Math.max(width / image.width, height / image.height);
    const sw = width / scale;
    const sh = height / scale;
    const sx = (image.width - sw) / 2;
    const sy = (image.height - sh) / 2;
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawCircleAvatar(ctx, image, x, y, radius, fallbackText) {
    ctx.save();
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.arc(x, y, radius + 9, 0, Math.PI * 2);
    ctx.fillStyle = '#090511';
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();

    if (image) {
        drawCover(ctx, image, x - radius, y - radius, radius * 2, radius * 2);
    } else {
        ctx.fillStyle = '#211333';
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(fallbackText, x, y + 8);
    }
    ctx.restore();
}

async function createWelcomeCard(userImg, botImg, userName, memberNumber, threadName) {
    const width = 1024;
    const height = 450;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // GALAXY BACKGROUND
    const bg = await loadRemoteImage(GALAXY_BG);

    if (bg) {
        drawCover(ctx, bg, 0, 0, width, height);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#090516');
        gradient.addColorStop(0.55, '#241044');
        gradient.addColorStop(1, '#05030b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    // DARK OVERLAY
    ctx.fillStyle = 'rgba(5, 3, 14, 0.48)';
    ctx.fillRect(0, 0, width, height);

    // RIGHT ANGLED PANEL
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(490, 0);
    ctx.lineTo(1024, 0);
    ctx.lineTo(1024, 450);
    ctx.lineTo(330, 450);
    ctx.closePath();

    ctx.fillStyle = 'rgba(7, 6, 15, 0.91)';
    ctx.fill();

    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 5;
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.moveTo(490, 0);
    ctx.lineTo(330, 450);
    ctx.stroke();
    ctx.restore();

    // USER AVATAR
    const userImage = await loadRemoteImage(userImg);
    drawCircleAvatar(ctx, userImage, 190, 190, 112, 'USER');

    // BOT AVATAR
    const botImage = await loadRemoteImage(botImg);
    drawCircleAvatar(ctx, botImage, 790, 285, 82, 'BOT');

    // WELCOME HEADING
    ctx.save();
    ctx.translate(760, 145);
    ctx.rotate(-0.10);
    ctx.textAlign = 'center';
    ctx.font = '900 65px Arial';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#09060f';
    ctx.strokeText('WELCOME TO', 0, 0);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 18;
    ctx.fillText('WELCOME TO', 0, 0);
    ctx.restore();

    // PURPLE UNDERLINE
    ctx.save();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 8;
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(535, 185);
    ctx.quadraticCurveTo(760, 215, 970, 170);
    ctx.stroke();
    ctx.restore();

    // GROUP NAME
    let groupLabel = String(threadName || 'GROUP').toUpperCase();

    ctx.textAlign = 'center';
    const groupSize = fitText(ctx, groupLabel, 590, 49, 24);
    ctx.font = `900 ${groupSize}px Arial`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#08050d';
    ctx.strokeText(groupLabel, 730, 420);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur = 14;
    ctx.fillText(groupLabel, 730, 420);

    // USER NAME BANNER
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 335);
    ctx.lineTo(380, 335);
    ctx.lineTo(420, 450);
    ctx.lineTo(0, 450);
    ctx.closePath();

    ctx.fillStyle = 'rgba(4, 3, 10, 0.94)';
    ctx.fill();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // USER NAME
    let displayName = String(userName || 'NEW MEMBER').toUpperCase();

    const nameSize = fitText(ctx, displayName, 370, 47, 22);
    ctx.textAlign = 'center';
    ctx.font = `900 ${nameSize}px Arial`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#08050d';
    ctx.strokeText(displayName, 195, 395);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(displayName, 195, 395);

    // MEMBER COUNT
    ctx.font = 'bold 25px Arial';
    ctx.fillStyle = '#e9d5ff';
    ctx.fillText(`★  ${memberNumber}TH MEMBER  ★`, 205, 435);

    // TAHA MD BRANDING
    ctx.textAlign = 'center';
    ctx.font = 'bold 21px Arial';
    ctx.fillStyle = '#c084fc';
    ctx.fillText('TAHA MD', 790, 385);

    return canvas.toBuffer('image/png');
}

module.exports = {
    config: {
        name: 'welcome',
        version: '6.0.0',
        author: 'xalman',
        category: 'events'
    },

    langs: {
        en: {
            welcomeMessage: '『 ᴛʜᴀɴᴋ ʏᴏᴜ ꜰᴏʀ ᴀᴅᴅɪɴɢ ᴍᴇ! 』',

            defaultWelcomeMessage:
                '『 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴛʜᴇ ɢʀᴏᴜᴘ 』\n' +
                '━━━━━━━━━━━━━━━━━━\n' +
                '👋 ʜᴇʟʟᴏ, {userNameTag}!\n' +
                '🏘️ ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ: {boxName}\n' +
                '🕒 ʜᴀᴠᴇ ᴀ ɢᴏᴏᴅ {session}'
        }
    },

    onStart: async ({ threadsData, message, event, api, getLang, usersData }) => {

        if (event.logMessageType !== 'log:subscribe') return;

        const { threadID } = event;
        const prefix = global.utils.getPrefix(threadID);
        const addedParticipants = event.logMessageData.addedParticipants || [];
        const botID = api.getCurrentUserID();

        // BOT ADDED TO GROUP
        if (addedParticipants.some(item => String(item.userFbId) === String(botID))) {
            if (global.GoatBot.config.nickNameBot) {
                api.changeNickname(
                    global.GoatBot.config.nickNameBot,
                    threadID,
                    botID
                );
            }

            return message.send(getLang('welcomeMessage', prefix));
        }

        if (!global.temp.welcomeEvent[threadID]) {
            global.temp.welcomeEvent[threadID] = {
                joinTimeout: null,
                dataAddedParticipants: []
            };
        }

        const state = global.temp.welcomeEvent[threadID];

        state.dataAddedParticipants.push(...addedParticipants);
        clearTimeout(state.joinTimeout);

        state.joinTimeout = setTimeout(async () => {
            try {
                const threadData = await threadsData.get(threadID);

                if (threadData.settings?.sendWelcomeMessage === false) {
                    delete global.temp.welcomeEvent[threadID];
                    return;
                }

                const joined = state.dataAddedParticipants;

                if (!joined.length) {
                    delete global.temp.welcomeEvent[threadID];
                    return;
                }

                const threadName = threadData.threadName || 'GROUP';

                const names = joined.map(user => user.fullName || 'New member');

                const mentions = joined.map(user => ({
                    tag: user.fullName || 'New member',
                    id: user.userFbId
                }));

                let {
                    welcomeMessage = getLang('defaultWelcomeMessage')
                } = threadData.data || {};

                const hour = Number(getTime('HH'));

                const session = hour < 12
                    ? 'morning'
                    : hour < 17
                        ? 'afternoon'
                        : 'evening';

                welcomeMessage = welcomeMessage
                    .replace(/\{userNameTag\}|\{userName\}/g, names.join(', '))
                    .replace(/\{boxName\}|\{threadName\}/g, threadName)
                    .replace(/\{session\}/g, session);

                const firstUser = joined[0];

                // USER PROFILE
                const userAvatar = await usersData.getAvatarUrl(firstUser.userFbId);

                // BOT PROFILE
                let botAvatar = null;

                try {
                    botAvatar = await usersData.getAvatarUrl(botID);
                } catch (error) {
                    console.log('[WELCOME] Bot avatar unavailable');
                }

                // MEMBER COUNT
                const memberCount = threadData.members?.length || 1;

                // CREATE WELCOME IMAGE
                const imageBuffer = await createWelcomeCard(
                    userAvatar,
                    botAvatar,
                    firstUser.fullName,
                    memberCount,
                    threadName
                );

                // SAVE IMAGE
                const cacheDir = path.join(__dirname, 'cache');

                await fs.ensureDir(cacheDir);

                const tempPath = path.join(
                    cacheDir,
                    `welcome_${Date.now()}.png`
                );

                await fs.writeFile(tempPath, imageBuffer);

                // SEND WELCOME MESSAGE
                await message.send({
                    body: welcomeMessage,
                    attachment: fs.createReadStream(tempPath),
                    mentions: mentions
                });

                // DELETE TEMP IMAGE
                setTimeout(() => {
                    fs.remove(tempPath).catch(() => {});
                }, 15000);

            } catch (error) {
                console.error('[WELCOME] Error:', error);
            } finally {
                delete global.temp.welcomeEvent[threadID];
            }

        }, 500);
    }
};
