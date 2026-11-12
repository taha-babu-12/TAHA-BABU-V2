/**
 * Created by xalman
 *repository: https://github.com/goatbotnx/GOAT-BOT-UPDATED
 * NX GoatBot - Web Control Panel
 * Panel password: set in the PANEL_PASSWORD constant below.
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const vm = require("vm");
const crypto = require("crypto");
const express = require("express");
const log = require("./logger/log.js");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
// ===== DASHBOARD PASSWORD (change it here) =====
const PANEL_PASSWORD = "tahakhan786";
const HOT_FILE = ".dashboard-hot.js";
const LOG_LIMIT = 1500;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCOUNT_FILES = ["account.txt", "account2.txt"];

/* =========================================================
 * LOG BUFFER
 * ======================================================= */

const logBuffer = [];
const sseClients = new Set();
let logId = 0;

const stripAnsi = s => String(s).replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, "");

function classify(plain, isErr) {
	if (/\bERROR\b|\bERR\b|FATAL|Unhandled|Uncaught|TypeError|ReferenceError|SyntaxError|EADDRINUSE|❌|✖/i.test(plain))
		return "err";
	if (/\bWARN\b|WARNING|⚠/i.test(plain))
		return "warn";
	return isErr ? "err" : "info";
}

const failedAccounts = new Set();

function pushLog(line, isErr) {
	if (line.length > 4000)
		line = line.slice(0, 4000) + " ...";
	const plain = stripAnsi(line);
	const entry = { id: ++logId, t: Date.now(), lv: classify(plain, isErr), line };
	logBuffer.push(entry);
	if (logBuffer.length > LOG_LIMIT)
		logBuffer.shift();

	const m = plain.match(/Marked (account2?\.txt) as failed/i);
	if (m)
		failedAccounts.add(m[1].toLowerCase());

	const payload = "id: " + entry.id + "\nevent: log\ndata: " + JSON.stringify(entry) + "\n\n";
	for (const res of sseClients) {
		try { res.write(payload); }
		catch (e) { sseClients.delete(res); }
	}
}

function webLog(msg) {
	console.log(msg);
	pushLog("[WEB] " + msg, false);
}

function pipeLines(stream, isErr) {
	let rest = "";
	stream.setEncoding("utf8");
	stream.on("data", chunk => {
		(isErr ? process.stderr : process.stdout).write(chunk);
		rest += chunk;
		const parts = rest.split("\n");
		rest = parts.pop();
		if (rest.length > 20000)
			rest = rest.slice(-20000);
		for (let p of parts) {
			p = p.replace(/\r+$/, "");
			const i = p.lastIndexOf("\r");
			if (i !== -1)
				p = p.slice(i + 1);
			if (p.trim() !== "")
				pushLog(p, isErr);
		}
	});
	stream.on("end", () => {
		if (rest.trim() !== "")
			pushLog(rest, isErr);
		rest = "";
	});
}

/* =========================================================
 * HOT-RELOAD AGENT
 * ======================================================= */

function hotPreload() {
	if (typeof process.send !== "function")
		return;
	const path = require("path");
	const fs = require("fs");
	const ROOT = process.cwd();

	const reply = (id, data) => {
		try { process.send(Object.assign({ type: "hot-result", id }, data)); }
		catch (e) { }
	};
	const removeAll = (arr, value) => {
		for (let i = arr.length - 1; i >= 0; i--)
			if (arr[i] === value) arr.splice(i, 1);
	};
	const replaceInPlace = (target, src) => {
		for (const k of Object.keys(target)) delete target[k];
		Object.assign(target, src);
	};

	async function reloadScript(rel) {
		const GoatBot = global.GoatBot;
		if (!GoatBot || !global.db || !GoatBot.commands)
			return { ok: false, notReady: true, error: "Bot is still starting up" };

		const norm = String(rel).split("\\").join("/");
		const m = norm.match(/^scripts\/(cmds|events)\/([^/]+\.js)$/);
		if (!m)
			return { ok: false, error: "Not a command/event file" };

		const folder = m[1], file = m[2];
		const isCmd = folder === "cmds";
		const text = isCmd ? "command" : "event command";
		const setMap = isCmd ? "commands" : "eventCommands";
		const filesKey = isCmd ? "commandFilesPath" : "eventCommandsFilesPath";
		const unloadKey = isCmd ? "commandUnload" : "commandEventUnload";
		const typeEnv = isCmd ? "envCommands" : "envEvents";
		const configCommands = GoatBot.configCommands || {};
		const fullPath = path.normalize(path.join(ROOT, norm));

		if (file.endsWith("eg.js"))
			return { ok: true, message: "Example file - the bot never loads these" };
		if (/dev\.js$/.test(file) && process.env.NODE_ENV !== "development")
			return { ok: true, message: "dev.js files only load in development mode" };
		if (Array.isArray(configCommands[unloadKey]) && configCommands[unloadKey].includes(file))
			return { ok: true, message: file + " is in the unload list, so it was saved but not loaded" };

		const list = GoatBot[filesKey];
		const oldEntry = list.find(x => path.normalize(x.filePath) === fullPath) || null;
		const oldName = oldEntry ? oldEntry.commandName[0] : null;

		const key = require.resolve(fullPath);
		const oldCache = require.cache[key];
		const restoreCache = () => { if (oldCache) require.cache[key] = oldCache; else delete require.cache[key]; };
		const fail = msg => { restoreCache(); return { ok: false, error: msg }; };

		delete require.cache[key];
		let command;
		try { command = require(fullPath); }
		catch (err) {
			restoreCache();
			let msg = err && err.message ? err.message : String(err);
			if (err && err.code === "MODULE_NOT_FOUND")
				msg += " (missing package? add it to package.json and redeploy)";
			return { ok: false, error: msg };
		}

		const cfg = command && command.config;
		if (!cfg) return fail("config of " + text + " is undefined");
		if (!cfg.category) return fail("category of " + text + " is undefined");
		if (!cfg.name) return fail("name of " + text + " is undefined");
		if (typeof command.onStart !== "function") return fail("onStart of " + text + " must be a function");

		const name = cfg.name;
		const lname = name.toLowerCase();
		const sameFile = oldName && oldName.toLowerCase() === lname;
		if (GoatBot[setMap].has(lname) && !sameFile)
			return fail(text + ' "' + name + '" already exists in another file');

		const validAliases = [];
		if (cfg.aliases) {
			if (!Array.isArray(cfg.aliases)) return fail('"config.aliases" must be an array');
			for (const alias of cfg.aliases) {
				if (cfg.aliases.filter(x => x === alias).length > 1)
					return fail('alias "' + alias + '" is duplicated');
				const owner = GoatBot.aliases.get(alias);
				if (owner && owner !== oldName)
					return fail('alias "' + alias + '" is already used by "' + owner + '"');
				validAliases.push(alias);
			}
		}

		if (cfg.envGlobal && typeof cfg.envGlobal === "object" && !Array.isArray(cfg.envGlobal)) {
			if (!configCommands.envGlobal) configCommands.envGlobal = {};
			for (const k of Object.keys(cfg.envGlobal))
				if (configCommands.envGlobal[k] === undefined) configCommands.envGlobal[k] = cfg.envGlobal[k];
		}
		if (cfg.envConfig && typeof cfg.envConfig === "object" && !Array.isArray(cfg.envConfig)) {
			if (!configCommands[typeEnv]) configCommands[typeEnv] = {};
			if (!configCommands[typeEnv][name]) configCommands[typeEnv][name] = {};
			for (const [k, v] of Object.entries(cfg.envConfig))
				if (configCommands[typeEnv][name][k] === undefined) configCommands[typeEnv][name][k] = v;
		}

		if (command.onLoad) {
			if (typeof command.onLoad !== "function") return fail('"onLoad" must be a function');
			try {
				await command.onLoad({
					api: GoatBot.fcaApi,
					threadModel: global.db.threadModel,
					userModel: global.db.userModel,
					dashBoardModel: global.db.dashBoardModel,
					globalModel: global.db.globalModel,
					threadsData: global.db.threadsData,
					usersData: global.db.usersData,
					dashBoardData: global.db.dashBoardData,
					globalData: global.db.globalData
				});
			}
			catch (err) { return fail("onLoad failed: " + (err && err.message ? err.message : String(err))); }
		}

		if (oldEntry) {
			GoatBot[setMap].delete(oldName.toLowerCase());
			for (const a of oldEntry.commandName.slice(1))
				if (GoatBot.aliases.get(a) === oldName) GoatBot.aliases.delete(a);
			for (const k of ["onChat", "onEvent", "onAnyEvent"])
				if (Array.isArray(GoatBot[k])) removeAll(GoatBot[k], oldName);
			GoatBot.onFirstChat = (GoatBot.onFirstChat || []).filter(i => i.commandName !== oldName);
			const idx = list.indexOf(oldEntry);
			if (idx !== -1) list.splice(idx, 1);
		}

		command.location = fullPath;
		for (const alias of validAliases) GoatBot.aliases.set(alias, name);
		if (command.onChat) GoatBot.onChat.push(name);
		if (command.onFirstChat) GoatBot.onFirstChat.push({ commandName: name, threadIDsChattedFirstTime: [] });
		if (command.onEvent) GoatBot.onEvent.push(name);
		if (command.onAnyEvent) GoatBot.onAnyEvent.push(name);
		GoatBot[setMap].set(lname, command);
		list.push({ filePath: fullPath, commandName: [name, ...validAliases] });
		try {
			if (global.temp && global.temp.contentScripts && global.temp.contentScripts[folder])
				global.temp.contentScripts[folder][file] = fs.readFileSync(fullPath, "utf8");
		} catch (e) { }

		return { ok: true, message: (isCmd ? "Command" : "Event") + ' "' + name + '" ' + (oldEntry ? "reloaded" : "loaded") + " instantly" };
	}

	function reloadJson(kind) {
		const GoatBot = global.GoatBot;
		if (!GoatBot || !GoatBot.config || !GoatBot.configCommands)
			return { ok: false, notReady: true, error: "Bot is still starting up" };
		const isMain = kind === "config";
		const file = isMain ? "config.json" : "configCommands.json";
		const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
		if (isMain) {
			if (parsed.whiteListMode && Array.isArray(parsed.whiteListMode.whiteListIds))
				parsed.whiteListMode.whiteListIds = parsed.whiteListMode.whiteListIds.map(x => String(x));
			replaceInPlace(GoatBot.config, parsed);
			return { ok: true, message: "config.json reloaded instantly" };
		}
		replaceInPlace(GoatBot.configCommands, parsed);
		GoatBot.envGlobal = GoatBot.configCommands.envGlobal;
		GoatBot.envCommands = GoatBot.configCommands.envCommands;
		GoatBot.envEvents = GoatBot.configCommands.envEvents;
		if (global.client) global.client.commandBanned = GoatBot.configCommands.commandBanned;
		return { ok: true, message: "configCommands.json reloaded instantly" };
	}

	process.on("message", async msg => {
		if (!msg || msg.type !== "hot") return;
		try {
			const r = msg.kind === "script" ? await reloadScript(msg.rel) : reloadJson(msg.kind);
			reply(msg.id, r);
		}
		catch (err) {
			reply(msg.id, { ok: false, error: err && err.message ? err.message : String(err) });
		}
	});
}

function writeHotAgent() {
	const code = "// Auto-generated by index.js\n(" + hotPreload.toString() + ")();\n";
	const file = path.join(ROOT, HOT_FILE);
	try {
		if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== code)
			fs.writeFileSync(file, code, "utf8");
		return true;
	}
	catch (e) {
		console.log("[WEB] Could not write hot-reload agent: " + e.message);
		return false;
	}
}

/* =========================================================
 * BOT PROCESS MANAGER
 * ======================================================= */

const bot = {
	child: null,
	state: "stopped",
	startedAt: null,
	restarts: 0,
	lastExit: null,
	restartRequested: false
};

function startProject() {
	bot.restartRequested = false;
	const hotOk = writeHotAgent();
	const args = hotOk ? ["-r", "./" + HOT_FILE, "Goat.js"] : ["Goat.js"];
	const child = spawn(process.execPath, args, {
		cwd: __dirname,
		env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR || "3" },
		stdio: ["inherit", "pipe", "pipe", "ipc"]
	});
	bot.child = child;
	bot.state = "running";
	bot.startedAt = Date.now();
	pipeLines(child.stdout, false);
	pipeLines(child.stderr, true);

	child.on("error", err => {
		pushLog("[WEB] Failed to start Goat.js: " + err.message, true);
	});

	child.on("message", m => {
		if (m && m.type === "hot-result") {
			const w = hotWaiters.get(m.id);
			if (w) {
				clearTimeout(w.timer);
				hotWaiters.delete(m.id);
				w.resolve(m);
			}
		}
	});

	child.on("close", (code, signal) => {
		if (bot.child !== child)
			return;
		bot.child = null;
		for (const [id, w] of hotWaiters) {
			clearTimeout(w.timer);
			w.resolve({ ok: false, notReady: true, error: "Bot process stopped" });
		}
		hotWaiters.clear();
		bot.lastExit = { code, signal, at: Date.now() };
		bot.startedAt = null;

		if (code == 2 || bot.restartRequested) {
			bot.state = "restarting";
			bot.restarts++;
			log.info("Restarting Project...");
			pushLog("[WEB] Restarting project...", false);
			setTimeout(startProject, 800);
		}
		else {
			bot.state = "stopped";
			pushLog("[WEB] Bot process stopped (code " + code + (signal ? ", signal " + signal : "") + ")", true);
		}
	});
}

const hotWaiters = new Map();
let hotSeq = 0;

function hotApply(payload) {
	return new Promise(resolve => {
		const child = bot.child;
		if (!child || !child.connected || bot.state !== "running")
			return resolve({ ok: false, notReady: true, error: "Bot is not running" });
		const id = ++hotSeq;
		const timer = setTimeout(() => {
			hotWaiters.delete(id);
			resolve({ ok: false, notReady: true, error: "The bot did not answer in time" });
		}, 15000);
		hotWaiters.set(id, { resolve, timer });
		try { child.send(Object.assign({ type: "hot", id }, payload)); }
		catch (e) {
			clearTimeout(timer);
			hotWaiters.delete(id);
			resolve({ ok: false, notReady: true, error: e.message });
		}
	});
}

let restartTimer = null;
function scheduleRestart() {
	clearTimeout(restartTimer);
	restartTimer = setTimeout(() => { restartTimer = null; restartBot(); }, 1200);
}

function restartBot() {
	if (bot.child) {
		bot.restartRequested = true;
		bot.state = "restarting";
		bot.child.kill("SIGTERM");
		const c = bot.child;
		setTimeout(() => { try { if (bot.child === c) c.kill("SIGKILL"); } catch (e) { } }, 8000);
	}
	else if (bot.state !== "restarting") {
		bot.restarts++;
		startProject();
	}
}

for (const sig of ["SIGTERM", "SIGINT"]) {
	process.on(sig, () => {
		try { if (bot.child) bot.child.kill(sig); } catch (e) { }
		setTimeout(() => process.exit(0), 300);
	});
}

/* =========================================================
 * AUTH
 * ======================================================= */

function getPanelKey() {
	return String(PANEL_PASSWORD);
}

function editorEnabled() {
	return getPanelKey().length >= 8;
}

const sha = v => crypto.createHash("sha256").update(String(v)).digest();
const sessions = new Map();
const SESSION_MS = 12 * 60 * 60 * 1000;
const attempts = new Map();

setInterval(() => {
	const now = Date.now();
	for (const [t, exp] of sessions) if (exp < now) sessions.delete(t);
	for (const [ip, a] of attempts) if (a.reset < now) attempts.delete(ip);
}, 60 * 1000).unref();

function getCookie(req, name) {
	const header = req.headers.cookie || "";
	for (const part of header.split(";")) {
		const i = part.indexOf("=");
		if (i > 0 && part.slice(0, i).trim() === name) {
			try { return decodeURIComponent(part.slice(i + 1).trim()); }
			catch (e) { return null; }
		}
	}
	return null;
}

function isAuthed(req) {
	const token = getCookie(req, "gb_sid");
	const exp = token && sessions.get(token);
	if (!exp || exp < Date.now())
		return false;
	return true;
}

function requireAuth(req, res, next) {
	if (!isAuthed(req))
		return res.status(401).json({ error: "Unauthorized" });
	next();
}

function requireEditor(req, res, next) {
	if (!editorEnabled())
		return res.status(403).json({
			error: "Read-only mode: PANEL_PASSWORD in index.js must be at least 8 characters to enable this.",
			readOnly: true
		});
	next();
}

/* =========================================================
 * STATUS
 * ======================================================= */

function readActive() {
	try { return JSON.parse(fs.readFileSync(path.join(ROOT, "active_account.json"), "utf8")); }
	catch (e) { return null; }
}

function isConfigured(file) {
	try {
		const text = fs.readFileSync(path.join(ROOT, file), "utf8").trim();
		return text.length > 0 && !/^paste/i.test(text);
	}
	catch (e) { return false; }
}

function getStatus() {
	const active = readActive();
	const botRunning = bot.state === "running";
	const accounts = ACCOUNT_FILES.map((file, i) => {
		const configured = isConfigured(file);
		const isActive = botRunning && !!active && active.file === file;
		if (isActive)
			failedAccounts.delete(file);
		let state = "rest";
		if (!configured) state = "empty";
		else if (isActive) state = "running";
		else if (failedAccounts.has(file)) state = "failed";
		return {
			number: i + 1,
			file,
			state,
			accountId: isActive ? (active.accountId || null) : null,
			since: isActive ? (active.updatedAt || null) : null
		};
	});

	const total = os.totalmem();
	const free = os.freemem();
	const mem = process.memoryUsage();
	return {
		now: Date.now(),
		editorEnabled: editorEnabled(),
		bot: {
			state: bot.state,
			pid: bot.child ? bot.child.pid : null,
			startedAt: bot.startedAt,
			restarts: bot.restarts,
			lastExit: bot.lastExit
		},
		accounts,
		server: {
			osUptimeMs: Math.round(os.uptime() * 1000),
			processUptimeMs: Math.round(process.uptime() * 1000),
			platform: os.platform() + " " + os.arch(),
			node: process.version,
			cpus: os.cpus().length,
			load: os.loadavg(),
			memTotal: total,
			memUsed: total - free,
			rss: mem.rss,
			heapUsed: mem.heapUsed
		}
	};
}

/* =========================================================
 * FILE HELPERS
 * ======================================================= */

const DENY_DIRS = new Set([".git", "node_modules", ".dashboard-backups"]);
const DENY_FILES = new Set([HOT_FILE]);
const HIDE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".mp3", ".mp4", ".wav", ".ogg", ".mov", ".ttf", ".otf", ".woff", ".woff2", ".zip", ".gz", ".sqlite", ".sqlite3", ".db"]);

function safePath(rel) {
	if (typeof rel !== "string" || !rel || rel.includes("\0"))
		return null;
	const abs = path.resolve(ROOT, rel.replace(/^[\\/]+/, ""));
	if (abs !== ROOT && !abs.startsWith(ROOT + path.sep))
		return null;
	const parts = path.relative(ROOT, abs).split(path.sep);
	if (parts.some(p => DENY_DIRS.has(p)))
		return null;
	if (DENY_FILES.has(parts[parts.length - 1]) && parts.length === 1)
		return null;
	try {
		let probe = abs;
		while (!fs.existsSync(probe) && probe !== ROOT)
			probe = path.dirname(probe);
		const real = fs.realpathSync(probe);
		const realRoot = fs.realpathSync(ROOT);
		if (real !== realRoot && !real.startsWith(realRoot + path.sep))
			return null;
	}
	catch (e) { return null; }
	return abs;
}

function listFiles() {
	const out = [];
	(function walk(dir, depth) {
		if (depth > 8 || out.length > 4000)
			return;
		let entries = [];
		try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
		catch (e) { return; }
		for (const ent of entries) {
			if (ent.isDirectory()) {
				if (!DENY_DIRS.has(ent.name))
					walk(path.join(dir, ent.name), depth + 1);
			}
			else if (ent.isFile()) {
				if (HIDE_EXT.has(path.extname(ent.name).toLowerCase()))
					continue;
				if (dir === ROOT && DENY_FILES.has(ent.name))
					continue;
				let size = 0;
				try { size = fs.statSync(path.join(dir, ent.name)).size; } catch (e) { }
				out.push({ path: path.relative(ROOT, path.join(dir, ent.name)).split(path.sep).join("/"), size });
			}
		}
	})(ROOT, 0);
	out.sort((a, b) => a.path.localeCompare(b.path));
	return out;
}
/*created by xalman*/

function validateContent(rel, content) {
	const ext = path.extname(rel).toLowerCase();
	if (ext === ".js" || ext === ".cjs") {
		try {
			new vm.Script("(function (exports, require, module, __filename, __dirname) {" + content + "\n})", { filename: rel });
		}
		catch (e) {
			return "Syntax error: " + e.message;
		}
	}
	else if (ext === ".json") {
		try { JSON.parse(content); }
		catch (e) { return "Invalid JSON: " + e.message; }
	}
	return null;
}

/* =========================================================
 * WEB SERVER
 * ======================================================= */

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((req, res, next) => {
	res.setHeader("X-Frame-Options", "DENY");
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("Referrer-Policy", "no-referrer");
	res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'");
	next();
});
app.use(express.json({ limit: "5mb" }));

app.get("/uptime", (req, res) => res.json({ status: "ok", uptime: Math.round(process.uptime()) }));
app.get("/health", (req, res) => res.json({ status: "ok", bot: bot.state }));

app.get("/", (req, res) => {
	res.setHeader("Content-Type", "text/html; charset=utf-8");
	res.setHeader("Cache-Control", "no-store");
	res.send(PAGE);
});

app.post("/api/login", (req, res) => {
	const ip = req.ip || "unknown";
	const now = Date.now();
	let a = attempts.get(ip);
	if (!a || a.reset < now)
		a = { n: 0, reset: now + 10 * 60 * 1000 };
	if (a.n >= 8) {
		attempts.set(ip, a);
		return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
	}
	const given = req.body && req.body.key;
	const ok = typeof given === "string" && crypto.timingSafeEqual(sha(given), sha(getPanelKey()));
	if (!ok) {
		a.n++;
		attempts.set(ip, a);
		return res.status(401).json({ error: "Wrong password" });
	}
	attempts.delete(ip);
	const token = crypto.randomBytes(32).toString("hex");
	sessions.set(token, now + SESSION_MS);
	res.setHeader("Set-Cookie", "gb_sid=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + (SESSION_MS / 1000) + (req.secure ? "; Secure" : ""));
	res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
	const token = getCookie(req, "gb_sid");
	if (token) sessions.delete(token);
	res.setHeader("Set-Cookie", "gb_sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
	res.json({ ok: true });
});

app.get("/api/me", (req, res) => res.json({ authed: isAuthed(req) }));

app.get("/api/status", requireAuth, (req, res) => {
	res.setHeader("Cache-Control", "no-store");
	res.json(getStatus());
});

app.get("/api/logs/stream", requireAuth, (req, res) => {
	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache, no-transform",
		"Connection": "keep-alive",
		"X-Accel-Buffering": "no"
	});
	res.write("retry: 2000\n\n");
	res.write("event: backlog\ndata: " + JSON.stringify(logBuffer) + "\n\n");
	sseClients.add(res);
	const hb = setInterval(() => { try { res.write(": hb\n\n"); } catch (e) { } }, 15000);
	req.on("close", () => { clearInterval(hb); sseClients.delete(res); });
});

app.post("/api/restart", requireAuth, requireEditor, (req, res) => {
	pushLog("[WEB] Restart requested from dashboard", false);
	restartBot();
	res.json({ ok: true });
});

app.get("/api/files", requireAuth, requireEditor, (req, res) => {
	res.json({ files: listFiles() });
});

app.get("/api/file", requireAuth, requireEditor, (req, res) => {
	const abs = safePath(String(req.query.path || ""));
	if (!abs)
		return res.status(400).json({ error: "Invalid path" });
	try {
		const st = fs.statSync(abs);
		if (!st.isFile()) return res.status(400).json({ error: "Not a file" });
		if (st.size > MAX_FILE_SIZE) return res.status(413).json({ error: "File is larger than 2 MB" });
		const buf = fs.readFileSync(abs);
		if (buf.subarray(0, 8000).includes(0))
			return res.status(415).json({ error: "Binary file, can't edit here" });
		res.json({ path: path.relative(ROOT, abs).split(path.sep).join("/"), content: buf.toString("utf8"), size: st.size, mtime: st.mtimeMs });
	}
	catch (e) {
		res.status(404).json({ error: "File not found" });
	}
});

const relOf = abs => path.relative(ROOT, abs).split(path.sep).join("/");
const backupName = rel => rel.split("/").join("__") + ".bak";

function classifyChange(rel) {
	if (/^scripts\/(cmds|events)\/[^/]+\.js$/.test(rel)) return { mode: "hot", kind: "script" };
	if (rel === "config.json") return { mode: "hot", kind: "config" };
	if (rel === "configCommands.json") return { mode: "hot", kind: "configCommands" };
	if (ACCOUNT_FILES.includes(rel)) {
		const a = readActive();
		if (bot.state === "running" && a && a.file === rel)
			return { mode: "restart", why: "the active account cookie changed" };
		return { mode: "none", note: "Standby account saved - it is used automatically when the bot switches to it" };
	}
	if (rel === "index.js")
		return { mode: "manual", note: "index.js is the dashboard itself - saved, it takes effect on the next deploy/restart of the whole service" };
	if (rel === "package.json" || rel === "package-lock.json" || rel === "Dockerfile")
		return { mode: "manual", note: "Saved - dependency/build files take effect on the next deploy" };
	if (/\.(js|cjs|mjs)$/i.test(rel))
		return { mode: "restart", why: "a core/helper file changed" };
	return { mode: "none", note: "Saved - no restart needed" };
}

class ApiError extends Error {
	constructor(status, message) { super(message); this.status = status; }
}

async function saveAndApply(rel, content) {
	const abs = safePath(rel);
	if (!abs || abs === ROOT)
		throw new ApiError(400, "Invalid path");
	if (typeof content !== "string")
		throw new ApiError(400, "Missing content");
	if (!content.trim())
		throw new ApiError(400, "Empty content");
	if (Buffer.byteLength(content) > MAX_FILE_SIZE)
		throw new ApiError(413, "Content is larger than 2 MB");

	const problem = validateContent(rel, content);
	if (problem)
		throw new ApiError(422, problem);

	let backup = null, prev = null;
	try {
		if (fs.existsSync(abs)) {
			if (!fs.statSync(abs).isFile())
				throw new ApiError(400, "Path is a directory");
			prev = fs.readFileSync(abs);
			const dir = path.join(ROOT, ".dashboard-backups");
			fs.mkdirSync(dir, { recursive: true });
			backup = backupName(relOf(abs));
			fs.writeFileSync(path.join(dir, backup), prev);
		}
		fs.mkdirSync(path.dirname(abs), { recursive: true });
		fs.writeFileSync(abs, content, "utf8");
	}
	catch (e) {
		if (e instanceof ApiError) throw e;
		throw new ApiError(500, "Write failed: " + e.message);
	}

	const relOut = relOf(abs);
	const rollback = () => {
		try {
			if (prev !== null) fs.writeFileSync(abs, prev);
			else fs.unlinkSync(abs);
		} catch (e) { }
	};

	const cls = classifyChange(relOut);
	let apply;

	if (cls.mode === "hot") {
		const r = await hotApply({ kind: cls.kind, rel: relOut });
		if (r.ok) {
			apply = { mode: "hot", message: r.message };
		}
		else if (r.notReady) {
			apply = { mode: "pending", message: "Saved. The bot is not ready right now, it will load this change by itself when it starts." };
			if (bot.state === "stopped") { scheduleRestart(); apply.message = "Saved. The bot was stopped, starting it now with your change."; }
		}
		else {
			rollback();
			webLog("Change rejected for " + relOut + ": " + r.error + " (file restored)");
			throw new ApiError(422, "Not applied: " + r.error + ". Your old version was restored and is still running.");
		}
	}
	else if (cls.mode === "restart") {
		scheduleRestart();
		apply = { mode: "restart", message: "Saved. Restarting the bot automatically (" + cls.why + ")..." };
	}
	else if (cls.mode === "manual") {
		apply = { mode: "manual", message: cls.note };
	}
	else {
		apply = { mode: "none", message: cls.note };
	}

	webLog("Saved " + relOut + " -> " + apply.message);
	return { ok: true, path: relOut, size: Buffer.byteLength(content), backup: backup ? ".dashboard-backups/" + backup : null, apply };
}

function sendErr(res, e) {
	res.status(e.status || 500).json({ error: e.message || "Error" });
}

app.post("/api/file", requireAuth, requireEditor, async (req, res) => {
	try {
		res.json(await saveAndApply(req.body && req.body.path, req.body && req.body.content));
	}
	catch (e) { sendErr(res, e); }
});

app.post("/api/file/restore", requireAuth, requireEditor, async (req, res) => {
	try {
		const abs = safePath(req.body && req.body.path);
		if (!abs || abs === ROOT)
			throw new ApiError(400, "Invalid path");
		const bak = path.join(ROOT, ".dashboard-backups", backupName(relOf(abs)));
		if (!fs.existsSync(bak))
			throw new ApiError(404, "No previous version saved for this file yet");
		const content = fs.readFileSync(bak, "utf8");
		const out = await saveAndApply(relOf(abs), content);
		out.content = content;
		res.json(out);
	}
	catch (e) { sendErr(res, e); }
});

app.post("/api/fetch-url", requireAuth, requireEditor, async (req, res) => {
	const url = req.body && req.body.url;
	if (typeof url !== "string" || !/^https?:\/\//i.test(url))
		return res.status(400).json({ error: "URL must start with http:// or https://" });
	try {
		const r = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "follow" });
		if (!r.ok)
			return res.status(502).json({ error: "Remote server answered " + r.status });
		const text = await r.text();
		if (text.length > MAX_FILE_SIZE)
			return res.status(413).json({ error: "Remote file is larger than 2 MB" });
		res.json({ content: text });
	}
	catch (e) {
		res.status(502).json({ error: "Failed to fetch url: " + e.message });
	}
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
	webLog("Web service running on port: " + PORT);
	if (!editorEnabled())
		webLog("Dashboard is READ-ONLY. PANEL_PASSWORD in index.js must be 8+ characters to enable the file editor.");
});

/* =========================================================
 * DASHBOARD PAGE
 * ======================================================= */

const PAGE = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0a0e1a">
<title>TAHA GoatBot - Control Panel</title>
<style>
:root{
  --bg:#0a0e1a; --bg2:#0f1426; --card:rgba(255,255,255,.045); --card2:rgba(255,255,255,.07);
  --line:rgba(255,255,255,.09); --text:#e8ecf8; --muted:#8c96b4; --accent:#7c5cff; --accent2:#22d3ee;
  --ok:#22c55e; --warn:#f59e0b; --err:#ef4444; --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Bengali",sans-serif}
body{background:
  radial-gradient(900px 500px at 8% -10%,rgba(124,92,255,.22),transparent 60%),
  radial-gradient(800px 500px at 100% 0%,rgba(34,211,238,.14),transparent 55%),var(--bg);background-attachment:fixed}
button,input,textarea{font:inherit;color:inherit}
.hidden{display:none!important}
.wrap{max-width:1180px;margin:0 auto;padding:18px 16px 40px}
.login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.login-box{width:100%;max-width:380px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:30px 26px;backdrop-filter:blur(14px);box-shadow:0 30px 80px rgba(0,0,0,.45)}
.logo{width:54px;height:54px;border-radius:16px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:grid;place-items:center;font-size:26px;margin-bottom:16px;box-shadow:0 10px 30px rgba(124,92,255,.4)}
.login-box h1{margin:0 0 4px;font-size:21px}
.login-box p{margin:0 0 20px;color:var(--muted)}
.field{width:100%;background:rgba(0,0,0,.28);border:1px solid var(--line);border-radius:12px;padding:12px 14px;outline:none;transition:.15s}
.field:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,92,255,.22)}
.btn{border:1px solid var(--line);background:var(--card2);padding:9px 15px;border-radius:11px;cursor:pointer;transition:.15s;white-space:nowrap}
.btn:hover{background:rgba(255,255,255,.12)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn.primary{background:linear-gradient(135deg,var(--accent),#5b8cff);border-color:transparent;color:#fff;font-weight:600}
.btn.primary:hover{filter:brightness(1.1)}
.btn.danger{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.4);color:#ffb4b4}
.btn.danger:hover{background:rgba(239,68,68,.27)}
.btn.sm{padding:6px 11px;font-size:12.5px;border-radius:9px}
.err-text{color:#ff9d9d;min-height:20px;margin:10px 0 0;font-size:13px}
header{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:18px}
.brand{display:flex;align-items:center;gap:12px;flex:1;min-width:200px}
.brand .logo{margin:0;width:44px;height:44px;font-size:21px;border-radius:13px}
.brand h2{margin:0;font-size:18px;letter-spacing:.2px}
.brand small{color:var(--muted)}
.pill{display:inline-flex;align-items:center;gap:8px;padding:6px 13px;border-radius:99px;font-size:12.5px;font-weight:600;border:1px solid var(--line);background:var(--card)}
.dot{width:9px;height:9px;border-radius:50%;background:var(--muted);flex:none}
.dot.ok{background:var(--ok);box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:pulse 1.8s infinite}
.dot.warn{background:var(--warn)}.dot.err{background:var(--err)}
@keyframes pulse{70%{box-shadow:0 0 0 9px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
.banner{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.35);color:#ffd48a;border-radius:14px;padding:11px 15px;margin-bottom:16px;font-size:13px}
.grid{display:grid;gap:14px}
.stats{grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px;backdrop-filter:blur(10px)}
.stat .label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.8px;display:flex;align-items:center;gap:7px}
.stat .value{font-size:24px;font-weight:700;margin-top:6px;font-variant-numeric:tabular-nums;letter-spacing:.2px}
.stat .sub{color:var(--muted);font-size:12px;margin-top:2px}
.grad{background:linear-gradient(90deg,#fff,#b7a8ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.bar{height:6px;border-radius:9px;background:rgba(255,255,255,.08);margin-top:10px;overflow:hidden}
.bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .6s}
h3.sec{margin:22px 2px 10px;font-size:13px;text-transform:uppercase;letter-spacing:1.1px;color:var(--muted);font-weight:600}
.accounts{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.acc{position:relative;overflow:hidden;transition:.2s}
.acc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--muted)}
.acc.running{border-color:rgba(34,197,94,.45);background:linear-gradient(180deg,rgba(34,197,94,.09),var(--card))}
.acc.running::before{background:var(--ok)}
.acc.rest::before{background:var(--warn)}
.acc.failed{border-color:rgba(239,68,68,.4)}.acc.failed::before{background:var(--err)}
.acc .top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.acc .name{font-weight:700;font-size:16px}
.badge{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;padding:4px 11px;border-radius:99px;letter-spacing:.3px}
.badge.running{background:rgba(34,197,94,.16);color:#7ef0a6}
.badge.rest{background:rgba(245,158,11,.15);color:#ffd48a}
.badge.failed{background:rgba(239,68,68,.16);color:#ffb0b0}
.badge.empty{background:rgba(255,255,255,.07);color:var(--muted)}
.acc .meta{color:var(--muted);font-size:12.5px;margin-top:10px;display:grid;gap:3px}
.acc .meta b{color:var(--text);font-weight:600;font-family:var(--mono);font-size:12px}
.tabs{display:flex;gap:8px;margin:24px 0 12px;flex-wrap:wrap}
.tab{border:1px solid var(--line);background:var(--card);padding:9px 18px;border-radius:99px;cursor:pointer;color:var(--muted);font-weight:600;transition:.15s}
.tab.on{background:linear-gradient(135deg,var(--accent),#5b8cff);color:#fff;border-color:transparent}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.toolbar .field{width:auto;flex:1;min-width:140px;padding:8px 12px;border-radius:10px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.seg button{border:0;background:transparent;padding:7px 12px;cursor:pointer;color:var(--muted);font-size:12.5px;font-weight:600}
.seg button.on{background:var(--card2);color:var(--text)}
.term{background:#05070d;border:1px solid var(--line);border-radius:14px;height:min(62vh,560px);overflow:auto;padding:12px 14px;font:12.5px/1.55 var(--mono);color:#cfd6ea;word-break:break-word}
.term .ln{white-space:pre-wrap;padding:0 2px;border-radius:4px}
.term .ln.err{background:rgba(239,68,68,.08)}
.term .ln.warn{background:rgba(245,158,11,.07)}
.term .ln.web{opacity:.8}
.live{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
.files{display:grid;grid-template-columns:290px 1fr;gap:14px}
@media(max-width:820px){.files{grid-template-columns:1fr}}
.tree{background:rgba(0,0,0,.2);border:1px solid var(--line);border-radius:14px;padding:10px;height:min(66vh,620px);overflow:auto;font-size:13px}
.tree .field{margin-bottom:8px;padding:8px 11px;border-radius:9px}
.tree .dir{cursor:pointer;padding:3px 6px;border-radius:6px;color:#b9c3e6;user-select:none;font-weight:600}
.tree .dir:hover,.tree .file:hover{background:var(--card2)}
.tree .file{cursor:pointer;padding:3px 6px;border-radius:6px;color:#cdd5ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tree .file.on{background:rgba(124,92,255,.28);color:#fff}
.tree .kids{margin-left:13px;border-left:1px dashed var(--line);padding-left:6px}
.editor{display:flex;flex-direction:column;gap:10px;min-width:0}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.row .field{flex:1;min-width:150px;padding:9px 12px;border-radius:10px;font-family:var(--mono);font-size:12.5px}
textarea.code{width:100%;height:min(54vh,500px);resize:vertical;background:#05070d;border:1px solid var(--line);border-radius:14px;padding:13px 14px;font:12.5px/1.55 var(--mono);color:#d7ddf2;outline:none;tab-size:2;white-space:pre;overflow:auto}
textarea.code:focus{border-color:var(--accent)}
.msg{min-height:20px;font-size:13px}.msg.ok{color:#7ef0a6}.msg.bad{color:#ff9d9d}.msg.info{color:var(--muted)}
.note{color:var(--muted);font-size:12px}
.lock{padding:40px 20px;text-align:center;color:var(--muted)}
@media(max-width:600px){.stats{grid-template-columns:1fr 1fr;gap:10px}.card{padding:13px 14px}.stat .value{font-size:19px}.stat .sub{font-size:11px}.wrap{padding:14px 12px 34px}}
footer{margin-top:34px;padding-top:20px;border-top:1px solid var(--line);text-align:center;color:var(--muted);font-size:12px}
footer .credit{font-size:14px;margin-bottom:10px;color:var(--text)}
footer .links{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
footer .links a{color:var(--text);text-decoration:none;padding:7px 14px;border-radius:99px;border:1px solid var(--line);background:var(--card);transition:.15s}
footer .links a:hover{background:var(--card2);border-color:var(--accent)}
footer .small{opacity:.7}
</style>
</head>
<body>

<div id="login" class="login hidden">
  <div class="login-box">
    <div class="logo">&#128016;</div>
    <h1>NX GoatBot</h1>
    <p>Enter the dashboard password to continue.</p>
    <input id="pw" class="field" type="password" placeholder="Password" autocomplete="current-password">
    <p id="loginErr" class="err-text"></p>
    <button id="loginBtn" class="btn primary" style="width:100%;padding:12px">Sign in</button>
  </div>
</div>

<div id="app" class="wrap hidden">
  <header>
    <div class="brand">
      <div class="logo">&#128016;</div>
      <div><h2>NX GoatBot <span class="grad">Control Panel</span></h2><small id="hostInfo">-</small></div>
    </div>
    <span class="pill"><span id="botDot" class="dot"></span><span id="botState">-</span></span>
    <button id="restartBtn" class="btn danger sm">&#8635; Restart bot</button>
    <button id="logoutBtn" class="btn sm">Sign out</button>
  </header>

  <div id="roBanner" class="banner hidden">
    &#128274; Read-only mode. The password in index.js (PANEL_PASSWORD) must be at least 8 characters to unlock the editor and restart button.
  </div>

  <div class="grid stats">
    <div class="card stat"><div class="label">&#9201; Bot uptime</div><div id="stBot" class="value grad">-</div><div id="stBotSub" class="sub">&nbsp;</div></div>
    <div class="card stat"><div class="label">&#128421; Server uptime</div><div id="stSrv" class="value grad">-</div><div id="stSrvSub" class="sub">&nbsp;</div></div>
    <div class="card stat"><div class="label">&#129504; Memory</div><div id="stMem" class="value">-</div><div id="stMemSub" class="sub">&nbsp;</div><div class="bar"><i id="memBar"></i></div></div>
    <div class="card stat"><div class="label">&#9889; System</div><div id="stSys" class="value">-</div><div id="stSysSub" class="sub">&nbsp;</div></div>
  </div>

  <h3 class="sec">Accounts</h3>
  <div id="accounts" class="grid accounts"></div>

  <div class="tabs">
    <button class="tab on" data-tab="logs">&#128220; Live Logs</button>
    <button class="tab" data-tab="files">&#128193; File Manager</button>
  </div>

  <section id="tab-logs">
    <div class="toolbar">
      <div class="seg" id="lvSeg">
        <button data-lv="all" class="on">All</button><button data-lv="info">Info</button><button data-lv="warn">Warn</button><button data-lv="err">Error</button>
      </div>
      <input id="logSearch" class="field" placeholder="Search logs...">
      <button id="scrollBtn" class="btn sm">Auto-scroll: on</button>
      <button id="clearBtn" class="btn sm">Clear</button>
      <button id="dlBtn" class="btn sm">Download</button>
      <span class="live"><span id="liveDot" class="dot"></span><span id="liveTxt">connecting</span> &middot; <span id="lineCount">0</span> lines</span>
    </div>
    <div id="term" class="term"></div>
  </section>

  <section id="tab-files" class="hidden">
    <div id="filesLocked" class="card lock hidden">&#128274; File manager is locked in read-only mode.</div>
    <div id="filesUi" class="files">
      <div class="tree">
        <input id="fileSearch" class="field" placeholder="Search files...">
        <div id="tree"></div>
      </div>
      <div class="editor">
        <div class="row">
          <input id="filePath" class="field" placeholder="path/to/file.js  (type a new path to create a file)" spellcheck="false">
          <button id="newBtn" class="btn sm">New</button>
        </div>
        <div class="row">
          <input id="fileUrl" class="field" placeholder="Optional: raw URL to load code from" spellcheck="false">
          <button id="urlBtn" class="btn sm">Load from URL</button>
        </div>
        <textarea id="code" class="code" spellcheck="false" placeholder="Select a file from the left, or type a new path above and paste your code here."></textarea>
        <div class="row">
          <button id="saveBtn" class="btn primary">Save &amp; auto-apply</button>
          <button id="restoreBtn" class="btn">Restore previous</button>
          <button id="reloadBtn" class="btn">Reload file</button>
          <span id="fileMeta" class="note"></span>
        </div>
        <div id="fileMsg" class="msg info"></div>
        <div class="note"><b>Auto-apply:</b> Ctrl+S saves and applies by itself.<br>
&#9889; <b>Commands &amp; events</b> (scripts/cmds, scripts/events) and <b>config files</b> reload instantly, no restart.<br>
&#128260; <b>Core files</b> (Goat.js, utils.js, bot/, func/, languages/...) and the active account cookie restart the bot automatically.<br>
&#128737; JS/JSON are syntax-checked first; a command that fails to load is rolled back and the old one keeps running.</div>
      </div>
    </div>
  </section>

  <footer>
    <div class="credit">Created by <b class="grad">xalman</b></div>
    <div class="links">
      <a href="https://github.com/goatbotnx" target="_blank" rel="noopener noreferrer">&#128025; GitHub: goatbotnx</a>
      <a href="https://github.com/goatbotnx/GOAT-BOT-UPDATED" target="_blank" rel="noopener noreferrer">&#128016; Bot repository: GOAT-BOT-UPDATED</a>
    </div>
    <div class="small">NX GoatBot &middot; dashboard auto-refreshes every 3 seconds</div>
  </footer>
</div>

<script>
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  function api(url, opts) {
    opts = opts || {};
    opts.credentials = "same-origin";
    if (opts.body && typeof opts.body !== "string") {
      opts.body = JSON.stringify(opts.body);
      opts.headers = { "Content-Type": "application/json" };
    }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && url !== "/api/login") { showLogin(); throw new Error("Unauthorized"); }
        if (!r.ok) { var e = new Error(j.error || ("HTTP " + r.status)); e.data = j; throw e; }
        return j;
      });
    });
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dur(ms) {
    if (ms == null || ms < 0) return "-";
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (d ? d + "d " : "") + (d || h ? pad(h) + "h " : "") + pad(m) + "m " + pad(x) + "s";
  }
  function bytes(n) {
    if (!n && n !== 0) return "-";
    var u = ["B", "KB", "MB", "GB", "TB"], i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return n.toFixed(i ? 1 : 0) + " " + u[i];
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var started = false;
  function showLogin() {
    $("#app").classList.add("hidden");
    $("#login").classList.remove("hidden");
    $("#pw").focus();
  }
  function showApp() {
    $("#login").classList.add("hidden");
    $("#app").classList.remove("hidden");
    if (!started) { started = true; startApp(); }
  }
  function doLogin() {
    $("#loginErr").textContent = "";
    api("/api/login", { method: "POST", body: { key: $("#pw").value } })
      .then(function () { $("#pw").value = ""; showApp(); })
      .catch(function (e) { $("#loginErr").textContent = e.message; });
  }
  $("#loginBtn").onclick = doLogin;
  $("#pw").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  $("#logoutBtn").onclick = function () { api("/api/logout", { method: "POST" }).then(function () { location.reload(); }); };

  var S = null, fetchedAt = 0, skew = 0, editorOn = false;

  function renderAccounts(list) {
    var box = $("#accounts");
    box.innerHTML = "";
    list.forEach(function (a) {
      var label = { running: "RUNNING", rest: "REST", failed: "FAILED", empty: "NOT SET" }[a.state];
      var card = el("div", "card acc " + a.state);
      var top = el("div", "top");
      top.appendChild(el("div", "name", "Account " + a.number));
      var b = el("span", "badge " + a.state);
      if (a.state === "running") b.appendChild(el("span", "dot ok"));
      b.appendChild(document.createTextNode(label));
      top.appendChild(b);
      card.appendChild(top);
      var meta = el("div", "meta");
      var r1 = el("div"); r1.appendChild(document.createTextNode("File: ")); r1.appendChild(el("b", null, a.file)); meta.appendChild(r1);
      if (a.state === "running") {
        if (a.accountId) { var r2 = el("div"); r2.appendChild(document.createTextNode("Facebook ID: ")); r2.appendChild(el("b", null, a.accountId)); meta.appendChild(r2); }
        if (a.since) { var r3 = el("div"); r3.appendChild(document.createTextNode("Active since: ")); r3.appendChild(el("b", null, new Date(a.since).toLocaleString())); meta.appendChild(r3); }
      } else if (a.state === "rest") meta.appendChild(el("div", null, "Standby - will take over if the active account fails."));
      else if (a.state === "failed") meta.appendChild(el("div", null, "Login failed recently. Update the cookie in " + a.file + "."));
      else meta.appendChild(el("div", null, "No cookie saved in this file yet."));
      card.appendChild(meta);
      box.appendChild(card);
    });
  }

  function applyStatus(s) {
    S = s; fetchedAt = Date.now(); skew = s.now - fetchedAt;
    editorOn = s.editorEnabled;
    $("#roBanner").classList.toggle("hidden", editorOn);
    $("#restartBtn").classList.toggle("hidden", !editorOn);
    $("#filesLocked").classList.toggle("hidden", editorOn);
    $("#filesUi").classList.toggle("hidden", !editorOn);

    var st = s.bot.state;
    $("#botState").textContent = st === "running" ? "Bot running" : st === "restarting" ? "Restarting..." : "Bot stopped";
    $("#botDot").className = "dot " + (st === "running" ? "ok" : st === "restarting" ? "warn" : "err");
    $("#hostInfo").textContent = s.server.platform + " \u00b7 Node " + s.server.node + " \u00b7 " + s.server.cpus + " CPU";

    var sv = s.server, pct = sv.memTotal ? Math.round(sv.memUsed / sv.memTotal * 100) : 0;
    $("#stMem").textContent = bytes(sv.rss);
    $("#stMemSub").textContent = "System " + bytes(sv.memUsed) + " / " + bytes(sv.memTotal) + " (" + pct + "%)";
    $("#memBar").style.width = Math.min(100, pct) + "%";
    $("#stSys").textContent = sv.load[0].toFixed(2);
    $("#stSysSub").textContent = "Load avg " + sv.load.map(function (x) { return x.toFixed(2); }).join(" / ");
    $("#stBotSub").textContent = s.bot.restarts ? s.bot.restarts + " restart(s) since web start" : "No restarts";
    renderAccounts(s.accounts);
    tick();
  }

  function tick() {
    if (!S) return;
    var now = Date.now(), el2 = now - fetchedAt;
    $("#stBot").textContent = S.bot.state === "running" && S.bot.startedAt ? dur(now + skew - S.bot.startedAt) : "Offline";
    $("#stSrv").textContent = dur(S.server.osUptimeMs + el2);
    $("#stSrvSub").textContent = "Web service up " + dur(S.server.processUptimeMs + el2);
  }
  setInterval(tick, 1000);

  function poll() { api("/api/status").then(applyStatus).catch(function () { }); }

  $("#restartBtn").onclick = function () {
    if (!confirm("Restart the bot now?")) return;
    api("/api/restart", { method: "POST" }).then(function () { setTimeout(poll, 800); }).catch(function (e) { alert(e.message); });
  };

  $$(".tab").forEach(function (t) {
    t.onclick = function () {
      $$(".tab").forEach(function (x) { x.classList.toggle("on", x === t); });
      $("#tab-logs").classList.toggle("hidden", t.dataset.tab !== "logs");
      $("#tab-files").classList.toggle("hidden", t.dataset.tab !== "files");
      if (t.dataset.tab === "files" && editorOn && !treeLoaded) loadTree();
    };
  });

  var BASE = ["#1b1f2b", "#ef5a5a", "#34d399", "#f5c04a", "#6ea8ff", "#c084fc", "#22d3ee", "#d7ddf2"];
  var BRIGHT = ["#6b7391", "#ff7b7b", "#5df0b4", "#ffd978", "#93bbff", "#d8a9ff", "#67e8f9", "#ffffff"];
  function c256(n) {
    if (n < 8) return BASE[n];
    if (n < 16) return BRIGHT[n - 8];
    if (n >= 232) { var g = 8 + (n - 232) * 10; return "rgb(" + g + "," + g + "," + g + ")"; }
    n -= 16; var r = Math.floor(n / 36), g2 = Math.floor(n % 36 / 6), b = n % 6;
    var f = function (v) { return v ? 55 + v * 40 : 0; };
    return "rgb(" + f(r) + "," + f(g2) + "," + f(b) + ")";
  }
  function ansiToNodes(str) {
    str = str.replace(/\x1b\[[0-9;?]*[A-Za-ln-z]/g, "");
    var re = /\x1b\[([0-9;]*)m/g, out = [], last = 0, m, st = { fg: null, bold: false, dim: false };
    function emit(txt) {
      if (!txt) return;
      var sp = document.createElement("span");
      sp.textContent = txt;
      if (st.fg) sp.style.color = st.fg;
      if (st.bold) sp.style.fontWeight = "700";
      if (st.dim) sp.style.opacity = ".65";
      out.push(sp);
    }
    while ((m = re.exec(str))) {
      emit(str.slice(last, m.index));
      last = re.lastIndex;
      var codes = m[1] === "" ? [0] : m[1].split(";").map(Number);
      for (var i = 0; i < codes.length; i++) {
        var c = codes[i];
        if (c === 0) { st.fg = null; st.bold = false; st.dim = false; }
        else if (c === 1) st.bold = true;
        else if (c === 2) st.dim = true;
        else if (c === 22) { st.bold = false; st.dim = false; }
        else if (c >= 30 && c <= 37) st.fg = BASE[c - 30];
        else if (c >= 90 && c <= 97) st.fg = BRIGHT[c - 90];
        else if (c === 39) st.fg = null;
        else if (c === 38) {
          if (codes[i + 1] === 2) { st.fg = "rgb(" + codes[i + 2] + "," + codes[i + 3] + "," + codes[i + 4] + ")"; i += 4; }
          else if (codes[i + 1] === 5) { st.fg = c256(codes[i + 2]); i += 2; }
        }
      }
    }
    emit(str.slice(last));
    return out;
  }
  function plain(str) { return str.replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, ""); }

  var term = $("#term"), autoScroll = true, lvFilter = "all", rawLines = [], MAXL = 1500;

  function matches(div) {
    var q = $("#logSearch").value.trim().toLowerCase();
    if (lvFilter !== "all" && div.dataset.lv !== lvFilter) return false;
    if (q && div.dataset.t.indexOf(q) === -1) return false;
    return true;
  }
  function addLine(e) {
    var div = el("div", "ln " + (e.lv === "err" ? "err" : e.lv === "warn" ? "warn" : ""));
    if (e.line.indexOf("[WEB]") === 0) div.classList.add("web");
    ansiToNodes(e.line).forEach(function (n) { div.appendChild(n); });
    if (!div.childNodes.length) div.appendChild(document.createTextNode(" "));
    var p = plain(e.line);
    div.dataset.lv = e.lv; div.dataset.t = p.toLowerCase();
    div.style.display = matches(div) ? "" : "none";
    term.appendChild(div);
    rawLines.push(p);
    if (term.childNodes.length > MAXL) { term.removeChild(term.firstChild); rawLines.shift(); }
  }
  function afterAdd() {
    $("#lineCount").textContent = term.childNodes.length;
    if (autoScroll) term.scrollTop = term.scrollHeight;
  }
  function refilter() {
    Array.prototype.forEach.call(term.childNodes, function (d) { d.style.display = matches(d) ? "" : "none"; });
    if (autoScroll) term.scrollTop = term.scrollHeight;
  }
  $("#lvSeg").onclick = function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    lvFilter = b.dataset.lv;
    $$("#lvSeg button").forEach(function (x) { x.classList.toggle("on", x === b); });
    refilter();
  };
  $("#logSearch").oninput = refilter;
  $("#scrollBtn").onclick = function () {
    autoScroll = !autoScroll;
    this.textContent = "Auto-scroll: " + (autoScroll ? "on" : "off");
    if (autoScroll) term.scrollTop = term.scrollHeight;
  };
  term.addEventListener("wheel", function () { if (autoScroll && term.scrollTop + term.clientHeight < term.scrollHeight - 40) { autoScroll = false; $("#scrollBtn").textContent = "Auto-scroll: off"; } });
  $("#clearBtn").onclick = function () { term.innerHTML = ""; rawLines = []; $("#lineCount").textContent = 0; };
  $("#dlBtn").onclick = function () {
    var blob = new Blob([rawLines.join("\n")], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "goatbot-logs-" + Date.now() + ".txt"; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  };

  var es = null, lastId = 0;
  function connectLogs() {
    if (es) es.close();
    es = new EventSource("/api/logs/stream");
    es.addEventListener("backlog", function (ev) {
      term.innerHTML = ""; rawLines = [];
      JSON.parse(ev.data).forEach(function (e) { addLine(e); lastId = e.id; });
      afterAdd();
      term.scrollTop = term.scrollHeight;
    });
    es.addEventListener("log", function (ev) {
      var e = JSON.parse(ev.data);
      if (e.id <= lastId) return;
      lastId = e.id; addLine(e); afterAdd();
    });
    es.onopen = function () { $("#liveDot").className = "dot ok"; $("#liveTxt").textContent = "live"; };
    es.onerror = function () {
      $("#liveDot").className = "dot warn"; $("#liveTxt").textContent = "reconnecting";
      api("/api/me").then(function (r) { if (!r.authed) showLogin(); }).catch(function () { });
    };
  }

  var treeLoaded = false, allFiles = [], currentPath = null, original = "", openDirs = {};
  var msg = function (t, k) { var m = $("#fileMsg"); m.textContent = t; m.className = "msg " + (k || "info"); };

  function loadTree() {
    api("/api/files").then(function (r) { allFiles = r.files; treeLoaded = true; renderTree(); })
      .catch(function (e) { msg(e.message, "bad"); });
  }
  function renderTree() {
    var q = $("#fileSearch").value.trim().toLowerCase(), box = $("#tree");
    box.innerHTML = "";
    if (q) {
      allFiles.filter(function (f) { return f.path.toLowerCase().indexOf(q) !== -1; }).slice(0, 200).forEach(function (f) { box.appendChild(fileRow(f.path, f.path)); });
      return;
    }
    var root = {};
    allFiles.forEach(function (f) {
      var parts = f.path.split("/"), node = root;
      for (var i = 0; i < parts.length - 1; i++) { node = node[parts[i] + "/"] = node[parts[i] + "/"] || {}; }
      node[parts[parts.length - 1]] = f.path;
    });
    (function build(node, parent, prefix) {
      Object.keys(node).sort(function (a, b) {
        var da = a.slice(-1) === "/", db = b.slice(-1) === "/";
        if (da !== db) return da ? -1 : 1; return a.localeCompare(b);
      }).forEach(function (k) {
        if (k.slice(-1) === "/") {
          var id = prefix + k, d = el("div", "dir", (openDirs[id] ? "\u25BE " : "\u25B8 ") + k.slice(0, -1));
          var kids = el("div", "kids" + (openDirs[id] ? "" : " hidden"));
          d.onclick = function () { openDirs[id] = !openDirs[id]; renderTree(); };
          parent.appendChild(d); parent.appendChild(kids);
          if (openDirs[id]) build(node[k], kids, id);
        } else parent.appendChild(fileRow(node[k], k));
      });
    })(root, box, "");
  }
  function fileRow(p, label) {
    var d = el("div", "file" + (p === currentPath ? " on" : ""), label);
    d.title = p; d.onclick = function () { openFile(p); };
    return d;
  }
  $("#fileSearch").oninput = renderTree;

  function dirty() { return currentPath !== null && $("#code").value !== original; }
  function openFile(p) {
    if (dirty() && !confirm("You have unsaved changes. Discard them?")) return;
    msg("Loading " + p + "...", "info");
    api("/api/file?path=" + encodeURIComponent(p)).then(function (r) {
      currentPath = r.path; original = r.content;
      $("#filePath").value = r.path; $("#code").value = r.content; $("#fileUrl").value = "";
      $("#fileMeta").textContent = bytes(r.size) + " \u00b7 modified " + new Date(r.mtime).toLocaleString();
      msg("Opened " + r.path, "ok"); renderTree();
    }).catch(function (e) { msg(e.message, "bad"); });
  }
  $("#reloadBtn").onclick = function () { if (currentPath) { original = $("#code").value; openFile(currentPath); } };
  $("#newBtn").onclick = function () {
    if (dirty() && !confirm("You have unsaved changes. Discard them?")) return;
    currentPath = null; original = ""; $("#code").value = ""; $("#filePath").value = "scripts/cmds/";
    $("#filePath").focus(); $("#fileMeta").textContent = "New file"; msg("Type the file path, paste code, then Save.", "info"); renderTree();
  };
  $("#urlBtn").onclick = function () {
    var u = $("#fileUrl").value.trim(); if (!u) return;
    msg("Downloading...", "info");
    api("/api/fetch-url", { method: "POST", body: { url: u } }).then(function (r) {
      $("#code").value = r.content; msg("Code loaded from URL - review it, then press Save.", "ok");
    }).catch(function (e) { msg(e.message, "bad"); });
  };

  function showApply(r, prefix) {
    var a = r.apply || {}, kind = a.mode === "hot" ? "ok" : a.mode === "restart" ? "ok" : a.mode === "manual" ? "info" : "ok";
    var icon = a.mode === "hot" ? "\u26A1 " : a.mode === "restart" ? "\uD83D\uDD04 " : a.mode === "manual" ? "\u2139\uFE0F " : "\u2705 ";
    msg(icon + (prefix || "") + (a.message || "Saved") + (r.backup ? "  (backup kept)" : ""), kind);
    if (a.mode === "restart") setTimeout(poll, 1500);
  }
  function afterSave(r) {
    currentPath = r.path; original = $("#code").value;
    $("#fileMeta").textContent = bytes(r.size) + " \u00b7 saved just now";
    if (!allFiles.some(function (f) { return f.path === r.path; })) loadTree(); else renderTree();
    showApply(r, r.path + ": ");
  }
  function save() {
    var p = $("#filePath").value.trim();
    if (!p || p.slice(-1) === "/") return msg("Enter a file path first", "bad");
    msg("Saving and applying...", "info");
    api("/api/file", { method: "POST", body: { path: p, content: $("#code").value } }).then(afterSave).catch(function (e) { msg("\u274C " + e.message, "bad"); });
  }
  $("#saveBtn").onclick = function () { save(); };
  $("#restoreBtn").onclick = function () {
    var p = $("#filePath").value.trim();
    if (!p || p.slice(-1) === "/") return msg("Open a file first", "bad");
    if (!confirm("Swap " + p + " with its previous saved version?")) return;
    msg("Restoring...", "info");
    api("/api/file/restore", { method: "POST", body: { path: p } }).then(function (r) {
      $("#code").value = r.content; afterSave(r);
    }).catch(function (e) { msg("\u274C " + e.message, "bad"); });
  };
  $("#code").addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      e.preventDefault();
      var t = this, s = t.selectionStart;
      t.value = t.value.slice(0, s) + "\t" + t.value.slice(t.selectionEnd);
      t.selectionStart = t.selectionEnd = s + 1;
    }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !$("#tab-files").classList.contains("hidden")) { e.preventDefault(); save(); }
  });
  window.addEventListener("beforeunload", function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ""; } });

  function startApp() {
    poll(); setInterval(poll, 3000); connectLogs();
  }
  api("/api/me").then(function (r) { if (r.authed) showApp(); else showLogin(); }).catch(showLogin);
})();
</script>
</body>
</html>`;

/* =========================================================
 * START THE BOT
 * ======================================================= */

startProject();

/**
 * Created by xalman
 */
