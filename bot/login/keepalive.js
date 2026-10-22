"use strict";

const fs = require("fs-extra");
const path = require("path");

const BASE_INTERVAL = 15 * 60 * 1000; // ~15 minutes
const JITTER = 3 * 60 * 1000;         // +/- 3 minutes, so the timing is not a fixed pattern
const PING_TIMEOUT = 30 * 1000;
const MAX_PING_FAILS = 3;

function nextDelay() {
    return BASE_INTERVAL - JITTER + Math.floor(Math.random() * JITTER * 2);
}

// Never overwrite a good account file with an incomplete cookie set
function hasLoginCookies(state) {
    return Array.isArray(state)
        && state.some(c => c && c.key === "c_user" && c.value)
        && state.some(c => c && c.key === "xs" && c.value);
}

/**
 * @param {object} api                   fca api object
 * @param {string|null} accountFileName  e.g. "account.txt" (null = don't save to a file)
 * @param {string} accountBaseDir        folder that holds the account file
 * @param {object} [options]
 * @param {{info?:Function,warn?:Function,error?:Function}} [options.log]
 * @param {Function} [options.transform]     appState => appState (e.g. keep only c_user/xs/datr/fr/sb/i_user)
 * @param {Function} [options.onBeforeSave]  called right before the file is written
 * @param {Function} [options.onAfterSave]   called right after the file is written
 * @param {Function} [options.onSessionLost] called once after repeated ping failures
 * @returns {{stop: Function}}
 */
module.exports = function startKeepalive(api, accountFileName, accountBaseDir, options = {}) {
    const logger = options.log || {};
    const info = msg => (logger.info ? logger.info(msg) : console.log(`[ KEEPALIVE ] ${msg}`));
    const warn = msg => (logger.warn ? logger.warn(msg) : console.log(`[ KEEPALIVE ] ⚠️ ${msg}`));
    const error = msg => (logger.error ? logger.error(msg) : console.log(`[ KEEPALIVE ] ❌ ${msg}`));

    const filePath = accountFileName && accountBaseDir
        ? path.join(accountBaseDir, accountFileName)
        : null;

    let stopped = false;
    let timer = null;
    let pingFails = 0;
    let sessionLostReported = false;
    let lastSaved = null;

    if (filePath) {
        try { lastSaved = fs.readFileSync(filePath, "utf8").trim(); } catch { lastSaved = null; }
    }

    function ping() {
        return new Promise(resolve => {
            let finished = false;
            const timeout = setTimeout(() => finish(false), PING_TIMEOUT);
            function finish(ok) {
                if (finished) return;
                finished = true;
                clearTimeout(timeout);
                resolve(ok);
            }
            try {
                api.getUserInfo(api.getCurrentUserID(), err => finish(!err));
            } catch {
                finish(false);
            }
        });
    }

    function saveCookies() {
        if (!filePath || typeof api.getAppState !== "function") return;

        let appState = api.getAppState();
        if (typeof options.transform === "function") appState = options.transform(appState);

        if (!hasLoginCookies(appState)) {
            warn("getAppState() returned incomplete cookies, file left untouched");
            return;
        }

        const json = JSON.stringify(appState, null, 2);
        if (json === lastSaved) return; // nothing changed, no need to write

        if (typeof options.onBeforeSave === "function") options.onBeforeSave();
        try {
            fs.writeFileSync(filePath, json);
            lastSaved = json;
            info(`✅ Cookies refreshed & saved to ${accountFileName}`);
        } finally {
            if (typeof options.onAfterSave === "function") options.onAfterSave();
        }
    }

    async function tick() {
        if (stopped) return;
        try {
            saveCookies();

            const ok = await ping();
            if (ok) {
                pingFails = 0;
                sessionLostReported = false;
            } else {
                pingFails++;
                warn(`Ping failed (${pingFails}/${MAX_PING_FAILS})`);
                if (pingFails >= MAX_PING_FAILS && !sessionLostReported) {
                    sessionLostReported = true;
                    error("Session looks lost (repeated ping failures)");
                    if (typeof options.onSessionLost === "function") {
                        try { options.onSessionLost(); } catch (e) { error("onSessionLost error: " + e.message); }
                    }
                }
            }
        } catch (e) {
            error("Error refreshing cookies: " + e.message);
        } finally {
            if (!stopped) timer = setTimeout(tick, nextDelay());
        }
    }

    timer = setTimeout(tick, nextDelay());
    info("🛡️ Auto Cookie Refresher is now ACTIVE!");

    return {
        stop() {
            stopped = true;
            if (timer) clearTimeout(timer);
        }
    };
};
