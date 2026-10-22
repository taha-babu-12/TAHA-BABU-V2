"use strict";

/**
 * autologin.js
 * Re-logs the bot in with email/password (+ 2FA secret) from config.json -> facebookAccount
 * when the cookie dies while the bot is running.
 *
 * Needs in config.json: facebookAccount.email, facebookAccount.password
 * (and "2FASecret" if the account uses 2FA; GoatBot saves it there after the first login).
 */

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Tune here if you want
const settings = {
    graceMs: 3 * 60 * 1000,          // cookie must stay dead this long before we log in again (skips short network blips)
    baseDelayMs: 2 * 60 * 1000,      // wait before retry #2: 2m, then 4m, 8m, 16m ...
    maxDelayMs: 60 * 60 * 1000,      // never wait more than 1 hour between attempts
    maxAttempts: 5,                  // after this many failed attempts stop and wait for you (no endless re-login)
    maxPerHour: 6,                   // hard cap on email logins per hour, so a bad loop can never spam Facebook
    jitterMs: 15000,                 // random extra wait so retries are not perfectly regular
    attemptTimeoutMs: 10 * 60 * 1000 // an attempt stuck (e.g. waiting for a 2FA code nobody can type) counts as failed
};

let deadSince = null;
let running = false;
let rerunRequested = false;
const recent = []; // timestamps of recent email-login attempts
let attempts = 0;

const logger = () => (global.utils && global.utils.log) || console;
const info = msg => (logger().info || console.log).call(logger(), "AUTO LOGIN", msg);
const warn = msg => (logger().warn || console.log).call(logger(), "AUTO LOGIN", msg);
const err = msg => (logger().err || logger().error || console.error).call(logger(), "AUTO LOGIN", msg);

function hasCredentials() {
    const fa = (global.GoatBot && global.GoatBot.config && global.GoatBot.config.facebookAccount) || {};
    return Boolean(fa.email && fa.password);
}

/** Call after every cookie check. */
function track(cookieIsLive) {
    if (cookieIsLive) deadSince = null;
    else if (deadSince === null) deadSince = Date.now();
}

/** True when the cookie has been dead long enough and an email login is possible. */
function shouldRelogin() {
    if (running || deadSince === null) return false;
    if (!hasCredentials()) return false;
    return Date.now() - deadSince >= settings.graceMs;
}

/**
 * Call before every email-login attempt.
 * Waits (backoff) if needed. Resolves false when the attempt limit is reached.
 */
async function nextAttempt() {
    if (attempts >= settings.maxAttempts) {
        err(`Gave up after ${attempts} failed login attempts. Check the account (checkpoint / suspension / wrong password / 2FA secret) and restart the bot.`);
        return false;
    }
    const now = Date.now();
    while (recent.length && now - recent[0] > 60 * 60 * 1000) recent.shift();
    if (recent.length >= settings.maxPerHour) {
        err(`Already tried ${recent.length} email logins in the last hour. Pausing to protect the account (it will try again on the next trigger after the hour passes).`);
        return false;
    }
    if (attempts > 0) {
        const delay = Math.min(settings.maxDelayMs, settings.baseDelayMs * 2 ** (attempts - 1)) + Math.floor(Math.random() * settings.jitterMs);
        warn(`Waiting ${Math.round(delay / 1000)}s before attempt ${attempts + 1}/${settings.maxAttempts}...`);
        await sleep(delay);
    }
    recent.push(Date.now());
    attempts++;
    return true;
}

/** Start an email/password re-login (uses GoatBot's own relogin function). */
async function run() {
    if (running) { rerunRequested = true; return; } // asked again while an attempt is in progress
    if (!hasCredentials()) {
        warn("No email/password in config.json (facebookAccount), cannot log in automatically.");
        return;
    }
    running = true;
    try {
        for (;;) {
            if (!(await nextAttempt())) return;
            try {
                info(`Logging in with email/password (attempt ${attempts}/${settings.maxAttempts})...`);
                let timer;
                try {
                    await Promise.race([
                        global.GoatBot.reLoginBot(true),
                        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("login attempt timed out")), settings.attemptTimeoutMs); })
                    ]);
                } finally {
                    clearTimeout(timer);
                }
                if (rerunRequested) { rerunRequested = false; continue; } // that login already failed meanwhile
                return; // login result is reported by login.js: success -> reset(), failure -> run() again
            } catch (e) {
                err("Email login failed: " + ((e && e.message) || e));
            }
        }
    } finally {
        running = false;
        rerunRequested = false;
    }
}

/** Call after a successful login. */
function reset() {
    attempts = 0;
    deadSince = null;
}

module.exports = { settings, track, shouldRelogin, nextAttempt, run, reset };
