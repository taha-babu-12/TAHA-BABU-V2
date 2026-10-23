"use strict";

/**
 * loginguard.js
 * Small safety helpers for the login flow:
 *  - waitTurn():   spaces out login attempts (also across restarts), so a crash/restart loop or an
 *                  account-switch loop can never hammer Facebook with logins.
 *  - pingSession(): quick "is the session still alive?" check.
 *  - scheduleListenerRestart(): restart only the MQTT listener after a temporary server error.
 */

const fs = require("fs-extra");
const path = require("path");

const settings = {
    windowMs: 60 * 60 * 1000,        // attempts are remembered for one hour
    baseGapMs: 30 * 1000,            // gap after the 2nd attempt: 30s, then 1m, 2m, 4m, 8m, 16m, 30m ...
    maxGapMs: 30 * 60 * 1000,
    jitterMs: 10 * 1000,
    pingTimeoutMs: 30 * 1000,
    restartDelayMs: 20 * 1000,       // wait before restarting the listener (+ up to 10s random)
    maxSwitchesPerHour: 4,           // automatic account switches started by the session check
    maxListenerRestarts: 6,          // per 15 minutes, then stop restarting and only log
    restartWindowMs: 15 * 60 * 1000
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const logger = () => (global.utils && global.utils.log) || console;
const warn = m => (logger().warn || console.log).call(logger(), "LOGIN GUARD", m);
const info = m => (logger().info || console.log).call(logger(), "LOGIN GUARD", m);

function attemptsFile() {
    const base = global.client && global.client.dirAccount ? path.dirname(global.client.dirAccount) : process.cwd();
    return path.join(base, "login_attempts.json");
}

function loadAttempts() {
    try {
        const list = JSON.parse(fs.readFileSync(attemptsFile(), "utf8"));
        return Array.isArray(list) ? list.filter(n => typeof n === "number") : [];
    }
    catch {
        return [];
    }
}

function saveAttempts(list) {
    try { fs.writeFileSync(attemptsFile(), JSON.stringify(list)); } catch { /* not critical */ }
}

/** Call right before every login attempt. Waits if too many attempts happened recently. */
async function waitTurn(kind = "login") {
    const now = Date.now();
    const recent = loadAttempts().filter(t => now - t < settings.windowMs);

    if (recent.length > 0) {
        const last = recent[recent.length - 1];
        const gap = Math.min(settings.maxGapMs, settings.baseGapMs * 2 ** (recent.length - 1));
        const wait = Math.max(0, last + gap - now);
        if (wait > 0) {
            const total = wait + Math.floor(Math.random() * settings.jitterMs);
            warn(`${recent.length} login attempt(s) in the last hour. Waiting ${Math.round(total / 1000)}s before the next ${kind} attempt to protect the account.`);
            await sleep(total);
        }
    }

    recent.push(Date.now());
    saveAttempts(recent);
}

/** true = Facebook still answers for this session */
function pingSession(api) {
    return new Promise(resolve => {
        let done = false;
        const timer = setTimeout(() => finish(false), settings.pingTimeoutMs);
        function finish(ok) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(ok);
        }
        try {
            api.getUserInfo(api.getCurrentUserID(), err => finish(!err));
        }
        catch {
            finish(false);
        }
    });
}

const switchTimes = [];

/** true = another automatic account switch is allowed (max maxSwitchesPerHour per hour) */
function allowSwitch() {
    const now = Date.now();
    while (switchTimes.length && now - switchTimes[0] > settings.windowMs) switchTimes.shift();
    if (switchTimes.length >= settings.maxSwitchesPerHour) {
        warn(`Already switched accounts ${switchTimes.length} times in the last hour, not switching again. Check both accounts.`);
        return false;
    }
    switchTimes.push(now);
    return true;
}

let pendingRestart = null;
const restartTimes = [];

/** Runs restartFn once after a short delay. Several errors in a row only cause one restart. */
function scheduleListenerRestart(restartFn) {
    if (pendingRestart) return;

    const now = Date.now();
    while (restartTimes.length && now - restartTimes[0] > settings.restartWindowMs) restartTimes.shift();
    if (restartTimes.length >= settings.maxListenerRestarts) {
        warn(`Listener already restarted ${restartTimes.length} times in 15 minutes, not restarting again. Check the connection.`);
        return;
    }
    restartTimes.push(now);

    pendingRestart = setTimeout(async () => {
        try { await restartFn(); }
        catch (e) { warn("Listener restart failed: " + ((e && e.message) || e)); }
        finally { pendingRestart = null; }
    }, settings.restartDelayMs + Math.floor(Math.random() * 10000));
}

module.exports = { settings, waitTurn, pingSession, allowSwitch, scheduleListenerRestart };
