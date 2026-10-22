"use strict";

/**
 * keepawake.js
 * Pings the bot's own public /uptime URL so hosts that sleep a service after
 * ~15 minutes without INBOUND traffic (e.g. Render free web service) see activity.
 *
 * URL comes from (first one found):
 *   1) env KEEP_AWAKE_URL   e.g. https://my-bot.onrender.com   (or the full .../uptime)
 *   2) env RENDER_EXTERNAL_URL  (Render sets this automatically)
 * If neither exists, nothing happens (e.g. on Railway/local).
 *
 * Needs config.json -> serverUptime.enable = true so the /uptime route exists.
 */

const axios = require("axios");

const BASE_INTERVAL = 10 * 60 * 1000; // must stay well under the host's 15 minutes
const JITTER = 2 * 60 * 1000;         // 8 - 12 minutes
const TIMEOUT = 20 * 1000;

let started = false;

function nextDelay() {
    return BASE_INTERVAL - JITTER + Math.floor(Math.random() * JITTER * 2);
}

function resolveUrl() {
    const base = process.env.KEEP_AWAKE_URL || process.env.RENDER_EXTERNAL_URL;
    if (!base) return null;
    const clean = base.trim().replace(/\/+$/, "");
    return clean.endsWith("/uptime") ? clean : clean + "/uptime";
}

module.exports = function startKeepAwake(options = {}) {
    const logger = options.log || {};
    const info = msg => (logger.info ? logger.info(msg) : console.log(`[ KEEPAWAKE ] ${msg}`));
    const warn = msg => (logger.warn ? logger.warn(msg) : console.log(`[ KEEPAWAKE ] ⚠️ ${msg}`));

    if (started) return;

    const url = resolveUrl();
    if (!url) {
        info("No KEEP_AWAKE_URL / RENDER_EXTERNAL_URL found, self-ping skipped.");
        return;
    }
    started = true;

    let lastOk = null; // log only when the state changes, not every 10 minutes

    async function ping() {
        try {
            await axios.get(url, { timeout: TIMEOUT, headers: { "User-Agent": "keep-awake" } });
            if (lastOk !== true) info(`✅ Self-ping OK (${url})`);
            lastOk = true;
        } catch (e) {
            if (lastOk !== false) warn(`Self-ping failed (${(e && e.message) || e}). Is serverUptime.enable true in config.json?`);
            lastOk = false;
        } finally {
            setTimeout(ping, nextDelay());
        }
    }

    setTimeout(ping, 60 * 1000); // first ping 1 minute after start
    info(`🛡️ Self-ping ACTIVE -> ${url} (every ~10 min)`);
};
