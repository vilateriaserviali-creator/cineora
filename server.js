const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: "20kb" }));
app.get("/", (req, res) => { res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate"); res.sendFile(path.join(__dirname, "index.html")); });
app.get("/cineora-hero.png", (req, res) => res.sendFile(path.join(__dirname, "cineora-hero.png")));
app.get("/cineora-cover.svg", (req, res) => {
  res.type("image/svg+xml");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.sendFile(path.join(__dirname, "cineora-cover.svg"));
});

app.get("/lira.svg", (req, res) => {
  res.type("image/svg+xml");
  res.set("Cache-Control", "public, no-store, no-cache, must-revalidate, proxy-revalidate");
  res.sendFile(path.join(__dirname, "lira.svg"));
});
app.get("/health", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.json({ ok: true, service: "CINEORA", time: Date.now() });
});

// Permanent user suggestions storage via PostgreSQL.
const { Pool } = require("pg");

const smtpUser = String(process.env.SMTP_USER || "").trim();
const smtpPass = String(process.env.SMTP_PASS || "").replace(/s+/g, "");
const fallbackSuggestions = [];
const mailer = smtpUser && smtpPass
  ? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass }
    })
  : null;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : undefined
    })
  : null;

async function initDatabase() {
  if (!pool) {
    console.warn("DATABASE_URL is not set. Suggestions storage is unavailable until PostgreSQL is connected.");
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id TEXT PRIMARY KEY,
      name VARCHAR(40) NOT NULL DEFAULT 'Гость',
      text TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title VARCHAR(140) NOT NULL,
      text TEXT NOT NULL,
      published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

app.post("/api/suggestions", async (req, res) => {
  try {
    if (!pool) {
      const name = String(req.body?.name || "Гость").trim().slice(0, 40);
      const text = String(req.body?.text || "").trim().slice(0, 1000);
      if (text.length < 3) return res.status(400).json({ ok: false, error: "Напишите предложение чуть подробнее." });
      const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name: name || "Гость", text, status: "new", createdAt: new Date().toISOString() };
      fallbackSuggestions.unshift(item);
      if (mailer) {
        try {
          await mailer.sendMail({ from: smtpUser, to: String(process.env.ADMIN_EMAIL || smtpUser).trim(), subject: "Новое предложение для CINEORA", text: ["Новое предложение для CINEORA", "", `Имя: ${item.name}`, "", item.text].join("\n") });
        } catch (mailErr) { console.error("Suggestion email failed:", mailErr); }
      }
      return res.json({ ok: true, stored: "memory" });
    }
    const name = String(req.body?.name || "Гость").trim().slice(0, 40);
    const text = String(req.body?.text || "").trim().slice(0, 1000);
    if (text.length < 3) return res.status(400).json({ ok: false, error: "Напишите предложение чуть подробнее." });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await pool.query("INSERT INTO suggestions (id, name, text) VALUES ($1, $2, $3)", [id, name || "Гость", text]);

    if (mailer) {
      try {
        await mailer.sendMail({
          from: smtpUser,
          to: String(process.env.ADMIN_EMAIL || smtpUser).trim(),
          subject: "Новое предложение для CINEORA",
          text: ["Новое предложение для CINEORA", "", `Имя: ${name || "Гость"}`, "", text].join("\n")
        });
      } catch (mailErr) {
        console.error("Suggestion email failed:", mailErr);
      }
    } else {
      console.warn("SMTP_USER/SMTP_PASS are not set. Suggestion email notification is disabled.");
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Suggestion insert error:", err);
    res.status(500).json({ ok: false, error: "Не удалось сохранить предложение." });
  }
});

app.get("/api/news", async (req, res) => {
  if (!pool) return res.json({ ok: true, news: [] });
  try {
    const result = await pool.query(`SELECT id, title, text, created_at AS "createdAt" FROM news WHERE published = TRUE ORDER BY created_at DESC LIMIT 12`);
    res.json({ ok: true, news: result.rows });
  } catch (err) {
    console.error("News list error:", err);
    res.status(500).json({ ok: false, error: "Не удалось загрузить обновления." });
  }
});

function adminAllowed(req) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return false;
  return String(req.headers["x-admin-password"] || "") === configured;
}

app.get("/api/admin/news", async (req, res) => {
  if (!adminAllowed(req)) return res.status(401).json({ ok: false, error: "Неверный пароль администратора." });
  if (!pool) return res.status(503).json({ ok: false, error: "PostgreSQL не подключён." });
  try {
    const result = await pool.query(`SELECT id, title, text, published, created_at AS "createdAt", updated_at AS "updatedAt" FROM news ORDER BY created_at DESC`);
    res.json({ ok: true, news: result.rows });
  } catch (err) {
    console.error("Admin news list error:", err);
    res.status(500).json({ ok: false, error: "Не удалось загрузить обновления." });
  }
});

app.post("/api/admin/news", async (req, res) => {
  if (!adminAllowed(req)) return res.status(401).json({ ok: false, error: "Неверный пароль администратора." });
  if (!pool) return res.status(503).json({ ok: false, error: "PostgreSQL не подключён." });
  const title = String(req.body?.title || "").trim().slice(0, 140);
  const text = String(req.body?.text || "").trim().slice(0, 3000);
  const published = req.body?.published !== false;
  if (title.length < 2) return res.status(400).json({ ok: false, error: "Добавьте заголовок." });
  if (text.length < 2) return res.status(400).json({ ok: false, error: "Добавьте текст обновления." });
  try {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const result = await pool.query(`INSERT INTO news (id, title, text, published) VALUES ($1, $2, $3, $4) RETURNING id, title, text, published, created_at AS "createdAt", updated_at AS "updatedAt"`, [id, title, text, published]);
    res.json({ ok: true, item: result.rows[0] });
  } catch (err) {
    console.error("News insert error:", err);
    res.status(500).json({ ok: false, error: "Не удалось сохранить обновление." });
  }
});

app.patch("/api/admin/news/:id", async (req, res) => {
  if (!adminAllowed(req)) return res.status(401).json({ ok: false, error: "Неверный пароль администратора." });
  if (!pool) return res.status(503).json({ ok: false, error: "PostgreSQL не подключён." });
  const fields = [];
  const values = [];
  if (req.body?.title !== undefined) { fields.push(`title = $${values.length + 1}`); values.push(String(req.body.title).trim().slice(0, 140)); }
  if (req.body?.text !== undefined) { fields.push(`text = $${values.length + 1}`); values.push(String(req.body.text).trim().slice(0, 3000)); }
  if (req.body?.published !== undefined) { fields.push(`published = $${values.length + 1}`); values.push(!!req.body.published); }
  if (!fields.length) return res.status(400).json({ ok: false, error: "Нет изменений." });
  fields.push(`updated_at = NOW()`);
  values.push(req.params.id);
  try {
    const result = await pool.query(`UPDATE news SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING id, title, text, published, created_at AS "createdAt", updated_at AS "updatedAt"`, values);
    if (!result.rowCount) return res.status(404).json({ ok: false, error: "Обновление не найдено." });
    res.json({ ok: true, item: result.rows[0] });
  } catch (err) {
    console.error("News update error:", err);
    res.status(500).json({ ok: false, error: "Не удалось обновить запись." });
  }
});

app.delete("/api/admin/news/:id", async (req, res) => {
  if (!adminAllowed(req)) return res.status(401).json({ ok: false, error: "Неверный пароль администратора." });
  if (!pool) return res.status(503).json({ ok: false, error: "PostgreSQL не подключён." });
  try {
    await pool.query("DELETE FROM news WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("News delete error:", err);
    res.status(500).json({ ok: false, error: "Не удалось удалить обновление." });
  }
});

app.get("/api/admin/suggestions", async (req, res) => {
  if (!adminAllowed(req)) return res.status(401).json({ ok: false, error: "Неверный пароль администратора." });
  if (!pool) return res.json({ ok: true, suggestions: fallbackSuggestions });
  try {
    const result = await pool.query(`SELECT id, name, text, status, created_at AS "createdAt" FROM suggestions ORDER BY created_at DESC`);
    res.json({ ok: true, suggestions: result.rows });
  } catch (err) {
    console.error("Suggestion list error:", err);
    res.status(500).json({ ok: false, error: "Не удалось загрузить предложения." });
  }
});

app.patch("/api/admin/suggestions/:id", async (req, res) => {
  if (!adminAllowed(req)) return res.status(401).json({ ok: false, error: "Неверный пароль администратора." });
  const allowed = new Set(["new", "in_progress", "done", "rejected"]);
  const status = String(req.body?.status || "");
  if (!allowed.has(status)) return res.status(400).json({ ok: false, error: "Недопустимый статус." });
  if (!pool) {
    const item = fallbackSuggestions.find(x => x.id === req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: "Предложение не найдено." });
    item.status = status;
    return res.json({ ok: true });
  }
  try {
    await pool.query("UPDATE suggestions SET status = $1 WHERE id = $2", [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Suggestion status error:", err);
    res.status(500).json({ ok: false, error: "Не удалось обновить статус." });
  }
});

app.delete("/api/admin/suggestions/:id", async (req, res) => {
  if (!adminAllowed(req)) return res.status(401).json({ ok: false, error: "Неверный пароль администратора." });
  if (!pool) {
    const index = fallbackSuggestions.findIndex(x => x.id === req.params.id);
    if (index < 0) return res.status(404).json({ ok: false, error: "Предложение не найдено." });
    fallbackSuggestions.splice(index, 1);
    return res.json({ ok: true });
  }
  try {
    await pool.query("DELETE FROM suggestions WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Suggestion delete error:", err);
    res.status(500).json({ ok: false, error: "Не удалось удалить предложение." });
  }
});


app.get("/api/admin/stats", async (req, res) => {
  if (!adminAllowed(req)) return res.status(401).json({ ok: false, error: "Неверный пароль администратора." });
  try {
    const activeRooms = [...rooms.entries()]
      .filter(([, room]) => room.users.size > 0)
      .map(([id, room]) => ({
        id,
        users: publicUsers(room),
        userCount: room.users.size,
        mediaUrl: room.mediaUrl || "",
        playing: !!room.playing,
        position: Number(room.position) || 0,
        updatedAt: room.updatedAt || Date.now()
      }))
      .sort((a,b) => b.userCount - a.userCount);
    let suggestionCount = 0;
    let newsCount = 0;
    if (pool) {
      const [s,n] = await Promise.all([
        pool.query("SELECT COUNT(*)::int AS count FROM suggestions"),
        pool.query("SELECT COUNT(*)::int AS count FROM news")
      ]);
      suggestionCount = s.rows[0]?.count || 0;
      newsCount = n.rows[0]?.count || 0;
    } else {
      suggestionCount = fallbackSuggestions.length;
    }
    res.json({
      ok: true,
      stats: {
        activeRooms: activeRooms.length,
        onlineUsers: activeRooms.reduce((sum, room) => sum + room.userCount, 0),
        suggestions: suggestionCount,
        news: newsCount
      },
      rooms: activeRooms
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ ok: false, error: "Не удалось загрузить статистику." });
  }
});

app.get("/admin", (req, res) => {
  res.type("html").send(String.raw`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#15151c">
<title>CINEORA — Админ-панель</title>
<style>
:root{--bg:#101016;--panel:#171720;--panel2:#1d1d28;--line:#2d2d3a;--text:#f4f2f7;--muted:#9a97a5;--pink:#f1b8cf;--lilac:#cbbcf5;--green:#9edc9d;--danger:#ef9caa;--shadow:0 18px 50px rgba(0,0,0,.25)}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;min-height:100vh;background:radial-gradient(circle at 15% 0%,rgba(203,188,245,.12),transparent 32%),radial-gradient(circle at 90% 10%,rgba(241,184,207,.1),transparent 30%),var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{width:min(1280px,calc(100% - 32px));margin:0 auto;padding:26px 0 44px}.top{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:4px 2px 22px}.brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--text)}.brand-mark{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,var(--pink),var(--lilac));color:#15151c;display:grid;place-items:center;font-weight:900;box-shadow:0 10px 28px rgba(203,188,245,.16)}.brand-name{font-weight:850;letter-spacing:.12em;font-size:20px}.brand-name span{opacity:.75}.site-link{color:var(--muted);text-decoration:none;border:1px solid var(--line);background:rgba(255,255,255,.03);padding:10px 14px;border-radius:999px}.site-link:hover{color:var(--text);background:rgba(255,255,255,.06)}.login{background:rgba(23,23,32,.86);border:1px solid var(--line);border-radius:24px;padding:22px;box-shadow:var(--shadow);display:flex;gap:10px;align-items:center;flex-wrap:wrap}.login input{flex:1;min-width:220px;padding:13px 15px;border-radius:13px;border:1px solid var(--line);background:#111119;color:var(--text);outline:none}.login input:focus{border-color:var(--lilac);box-shadow:0 0 0 3px rgba(203,188,245,.1)}button{font:inherit}.btn{border:1px solid transparent;border-radius:13px;padding:12px 16px;background:linear-gradient(135deg,var(--pink),var(--lilac));color:#181720;font-weight:800;cursor:pointer}.btn:hover{transform:translateY(-1px);filter:brightness(1.04)}.btn.secondary{background:var(--panel2);border-color:var(--line);color:var(--text)}.status{font-size:13px;color:var(--muted)}.error{color:var(--danger);margin-top:10px}.dashboard{display:none}.dashboard.show{display:block}.hero{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:28px 0 18px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);margin-bottom:8px}.hero h1{font-size:clamp(30px,5vw,46px);line-height:1.05;margin:0;letter-spacing:-.04em}.hero p{margin:10px 0 0;color:var(--muted)}.hero-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.updated{font-size:12px;color:var(--muted)}.nav{display:flex;gap:7px;overflow:auto;padding:6px;background:rgba(23,23,32,.8);border:1px solid var(--line);border-radius:16px;margin:18px 0}.nav button{white-space:nowrap;border:0;background:transparent;color:var(--muted);padding:11px 15px;border-radius:11px;cursor:pointer;font-weight:700}.nav button.active{background:#292937;color:var(--text);box-shadow:inset 0 0 0 1px #3a3a4b}.view{display:none}.view.active{display:block}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stat{background:linear-gradient(145deg,rgba(29,29,40,.98),rgba(23,23,32,.98));border:1px solid var(--line);border-radius:20px;padding:19px;min-height:120px}.stat-icon{font-size:20px}.stat b{display:block;font-size:34px;letter-spacing:-.04em;margin-top:10px}.stat span{color:var(--muted);font-size:13px}.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin-top:14px}.card{background:rgba(23,23,32,.94);border:1px solid var(--line);border-radius:20px;padding:20px;box-shadow:0 12px 34px rgba(0,0,0,.14)}.card h2{font-size:18px;margin:0}.card-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:15px}.room-list,.cards{display:grid;gap:10px}.room,.idea,.news{background:#13131b;border:1px solid #292936;border-radius:16px;padding:15px}.room-head,.idea-head,.news-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.room-code{font-weight:850;letter-spacing:.08em}.pill{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#20202b;color:var(--muted);font-size:12px}.pill.live{color:var(--green);background:rgba(158,220,157,.09)}.room-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.people{margin-top:11px;color:var(--muted);font-size:13px;line-height:1.6}.person-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);margin-right:6px;box-shadow:0 0 10px rgba(158,220,157,.7)}.toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:15px 0}.toolbar input,.toolbar select{padding:12px 13px;border-radius:12px;border:1px solid var(--line);background:#111119;color:var(--text);outline:none}.toolbar input{flex:1;min-width:220px}.toolbar input:focus,.toolbar select:focus{border-color:var(--lilac)}.idea-text,.news-text{margin:13px 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;color:#ddd9e3}.person{font-weight:800}.date{font-size:12px;color:var(--muted);margin-top:4px}.empty{padding:22px;text-align:center;color:var(--muted);border:1px dashed #30303d;border-radius:14px}.actions{display:flex;gap:8px;flex-wrap:wrap}.smallbtn{border:1px solid var(--line);background:#1b1b25;color:var(--text);border-radius:10px;padding:8px 11px;cursor:pointer;font-weight:700}.smallbtn.primary{background:linear-gradient(135deg,var(--pink),var(--lilac));color:#181720;border-color:transparent}.smallbtn.danger{color:var(--danger)}.select{padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:#111119;color:var(--text)}.news-edit{display:grid;gap:9px;margin-top:13px}.news-edit input,.news-edit textarea{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:#111119;color:var(--text);outline:none;font:inherit}.news-edit textarea{min-height:100px;resize:vertical}.check{font-size:13px;color:var(--muted);display:flex;align-items:center;gap:7px}.published{font-size:12px;color:var(--green)}.unpublished{font-size:12px;color:var(--muted)}@media(max-width:900px){.stats{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}}@media(max-width:600px){.wrap{width:min(100% - 20px,1280px)}.stats{grid-template-columns:1fr}.hero{align-items:flex-start;flex-direction:column}}
</style>
</head>
<body>
<div class="wrap">
<header class="top"><a class="brand" href="/"><span class="brand-mark">C</span><span class="brand-name">CINE<span>ORA</span></span></a><a class="site-link" href="/">← На сайт</a></header>
<section class="login" id="loginBox"><input id="pass" type="password" placeholder="Пароль администратора"><button class="btn" onclick="openAdmin()">Войти</button><span class="status" id="loginStatus">Пароль не сохраняется.</span></section>
<section class="dashboard" id="dashboard">
<div class="hero"><div><div class="eyebrow">CINEORA control</div><h1>Панель управления</h1><p>Комнаты, предложения пользователей и новости.</p></div><div class="hero-actions"><span class="updated" id="updated"></span><button class="btn secondary" onclick="refreshAll()">Обновить</button></div></div>
<nav class="nav"><button class="active" data-view="overview">Обзор</button><button data-view="rooms">Комнаты</button><button data-view="ideas">Предложения</button><button data-view="news">Обновления</button></nav>
<section class="view active" id="view-overview"><div class="stats"><article class="stat"><div class="stat-icon">🎬</div><b id="statRooms">0</b><span>Активные комнаты</span></article><article class="stat"><div class="stat-icon">👥</div><b id="statUsers">0</b><span>Онлайн</span></article><article class="stat"><div class="stat-icon">💡</div><b id="statIdeas">0</b><span>Предложения</span></article><article class="stat"><div class="stat-icon">📰</div><b id="statNews">0</b><span>Обновления</span></article></div><div class="grid"><section class="card"><div class="card-head"><h2>Сейчас смотрят</h2></div><div id="overviewRooms" class="room-list"></div></section><section class="card"><div class="card-head"><h2>Быстрые действия</h2></div><div class="actions"><button class="smallbtn" onclick="switchView('ideas')">Предложения</button><button class="smallbtn" onclick="switchView('news')">Обновления</button><button class="smallbtn" onclick="loadStats()">Обновить статистику</button></div></section></div></section>
<section class="view" id="view-rooms"><section class="card"><div class="card-head"><h2>Активные комнаты</h2><span class="status" id="roomsCount">0 комнат</span></div><div id="roomsList" class="room-list"></div></section></section>
<section class="view" id="view-ideas"><section class="card"><div class="card-head"><h2>Предложения пользователей</h2><span class="status" id="ideasCount">0</span></div><div class="toolbar"><input id="search" placeholder="Поиск по имени и тексту"><select id="filter"><option value="all">Все</option><option value="new">Новые</option><option value="in_progress">В работе</option><option value="done">Добавлено</option><option value="rejected">Отклонено</option></select></div><div id="list" class="cards"></div></section></section>
<section class="view" id="view-news"><section class="card"><div class="card-head"><h2>Новое обновление</h2><span class="status" id="newsStatus"></span></div><div class="news-edit"><input id="newsTitle" placeholder="Заголовок"><textarea id="newsText" placeholder="Текст обновления"></textarea><label class="check"><input id="newsPublished" type="checkbox" checked> Показывать на сайте</label><button class="btn" onclick="createNews()">Опубликовать</button></div></section><section class="card" style="margin-top:14px"><div class="card-head"><h2>Все обновления</h2><span class="status" id="newsCount">0</span></div><div id="newsList" class="cards"></div></section></section>
</section>
</div>
<script>
let password="",rooms=[],items=[],newsItems=[];
async function api(path,options={}){const res=await fetch(path,{...options,headers:{...(options.headers||{}),"x-admin-password":password}});const data=await res.json().catch(()=>({}));if(!res.ok||data.ok===false)throw new Error(data.error||("HTTP "+res.status));return data}
function openAdmin(){password=document.getElementById("pass").value.trim();refreshAll()}
function switchView(name){document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===name));document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name))}
document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function fmtDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleString("ru-RU",{dateStyle:"medium",timeStyle:"short"})}
function roomMarkup(room){const media=room.mediaUrl?esc(room.mediaUrl.length>72?room.mediaUrl.slice(0,72)+"…":room.mediaUrl):"без видео";const names=(room.users||[]).map(u=>"<span class='person-dot'></span>"+esc(u.name)+" <span class='date'>"+Math.floor(Number(u.position)||0)+"с</span>").join(" · ");return "<article class='room'><div class='room-head'><div><div class='room-code'>"+esc(room.id)+"</div><div class='date'>Последняя активность: "+fmtDate(room.updatedAt)+"</div></div><span class='pill "+(room.playing?"live":"")+"\">"+(room.playing?"▶ воспроизводится":"Ⅱ пауза")+"</span></div><div class='room-meta'><span class='pill'>👥 "+room.userCount+"</span><span class='pill'>"+media+"</span></div><div class='people'>"+(names||"Участников нет")+"</div></article>"}
function renderRooms(){const html=rooms.length?rooms.map(roomMarkup).join(""):"<div class='empty'>Сейчас активных комнат нет.</div>";document.getElementById("roomsList").innerHTML=html;document.getElementById("overviewRooms").innerHTML=rooms.slice(0,6).map(roomMarkup).join("")||"<div class='empty'>Пока никто не смотрит.</div>";document.getElementById("roomsCount").textContent=rooms.length+" "+(rooms.length===1?"комната":"комнат")}
function renderIdeas(){const q=(document.getElementById("search").value||"").toLowerCase().trim();const f=document.getElementById("filter").value;const visible=items.filter(x=>(f==="all"||x.status===f)&&((x.name||"").toLowerCase().includes(q)||(x.text||"").toLowerCase().includes(q)));document.getElementById("ideasCount").textContent=visible.length+" из "+items.length;document.getElementById("list").innerHTML=visible.length?visible.map(x=>"<article class='idea'><div class='idea-head'><div><div class='person'>"+esc(x.name||"Гость")+"</div><div class='date'>"+fmtDate(x.createdAt)+"</div></div><span class='pill'>"+labels[x.status]+"</span></div><div class='idea-text'>"+esc(x.text)+"</div><div class='actions'><select class='select' onchange='setStatus(\\\""+esc(x.id)+"\\\",this.value)'><option value='new' "+(x.status==="new"?"selected":"")+">Новое</option><option value='in_progress' "+(x.status==="in_progress"?"selected":"")+">В работе</option><option value='done' "+(x.status==="done"?"selected":"")+">Добавлено</option><option value='rejected' "+(x.status==="rejected"?"selected":"")+">Отклонено</option></select><button class='smallbtn danger' onclick='deleteIdea(\\\""+esc(x.id)+"\\\")'>Удалить</button></div></article>").join(""):"<div class='empty'>По этому фильтру ничего нет.</div>"}
async function loadIdeas(){const d=await api("/api/admin/suggestions");items=d.suggestions||[];renderIdeas()}
async function setStatus(id,status){try{await api("/api/admin/suggestions/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});const x=items.find(i=>i.id===id);if(x)x.status=status;renderIdeas()}catch(e){alert(e.message)}}
async function deleteIdea(id){if(!confirm("Удалить предложение?"))return;try{await api("/api/admin/suggestions/"+encodeURIComponent(id),{method:"DELETE"});await loadIdeas();loadStats()}catch(e){alert(e.message)}}
function renderNews(){document.getElementById("newsCount").textContent=newsItems.length;document.getElementById("newsList").innerHTML=newsItems.length?newsItems.map(x=>"<article class='news'><div class='news-head'><div><div class='person'>"+esc(x.title)+"</div><div class='date'>"+fmtDate(x.createdAt)+"</div></div><span class='"+(x.published?"published":"unpublished")+"'>"+(x.published?"● Опубликовано":"○ Скрыто")+"</span></div><div class='news-edit'><input id='nt-"+esc(x.id)+"' value='"+esc(x.title)+"'><textarea id='nx-"+esc(x.id)+"'>"+esc(x.text)+"</textarea><div class='actions'><label class='check'><input type='checkbox' id='np-"+esc(x.id)+"' "+(x.published?"checked":"")+"> Показывать</label><button class='smallbtn primary' onclick='saveNews(\\\""+esc(x.id)+"\\\")'>Сохранить</button><button class='smallbtn danger' onclick='deleteNews(\\\""+esc(x.id)+"\\\")'>Удалить</button></div></div></article>").join(""):"<div class='empty'>Обновлений пока нет.</div>"}
async function loadNews(){const d=await api("/api/admin/news");newsItems=d.news||[];renderNews()}
async function createNews(){const title=document.getElementById("newsTitle").value.trim(),text=document.getElementById("newsText").value.trim(),published=document.getElementById("newsPublished").checked;if(title.length<2||text.length<2){document.getElementById("newsStatus").textContent="Заполните заголовок и текст.";return}try{await api("/api/admin/news",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,text,published})});document.getElementById("newsTitle").value="";document.getElementById("newsText").value="";document.getElementById("newsStatus").textContent="✓ Опубликовано";await loadNews();await loadStats()}catch(e){document.getElementById("newsStatus").textContent=e.message}}
async function saveNews(id){const title=document.getElementById("nt-"+id).value.trim(),text=document.getElementById("nx-"+id).value.trim(),published=document.getElementById("np-"+id).checked;try{await api("/api/admin/news/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,text,published})});await loadNews();await loadStats()}catch(e){alert(e.message)}}
async function deleteNews(id){if(!confirm("Удалить обновление?"))return;try{await api("/api/admin/news/"+encodeURIComponent(id),{method:"DELETE"});await loadNews();await loadStats()}catch(e){alert(e.message)}}
async function loadStats(){const d=await api("/api/admin/stats");rooms=d.rooms||[];document.getElementById("statRooms").textContent=d.stats?.activeRooms||0;document.getElementById("statUsers").textContent=d.stats?.onlineUsers||0;document.getElementById("statIdeas").textContent=d.stats?.suggestions||0;document.getElementById("statNews").textContent=d.stats?.news||0;renderRooms();document.getElementById("updated").textContent="Обновлено в "+new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
async function refreshAll(){if(!password)return;try{await Promise.all([loadStats(),loadIdeas(),loadNews()]);document.getElementById("dashboard").classList.add("show");document.getElementById("loginBox").style.display="none";document.getElementById("loginStatus").textContent=""}catch(e){document.getElementById("loginStatus").innerHTML="<span class='error'>"+esc(e.message)+"</span>";document.getElementById("dashboard").classList.remove("show")}}
document.getElementById("pass").addEventListener("keydown",e=>{if(e.key==="Enter")openAdmin()});
setInterval(()=>{if(password&&document.getElementById("dashboard").classList.contains("show"))refreshAll()},10000);
</script>
</body>
</html>`);
});
const rooms = new Map();
function roomState(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, { users: new Map(), hostId: null, playing: false, position: 0, updatedAt: Date.now(), mediaUrl: "", messages: [], emptySince: null, isPrivate: false, accessToken: null });
  return rooms.get(roomId);
}
function publicUsers(room) {
  const now = Date.now();
  return [...room.users.values()].map(u => ({
    id: u.id,
    name: u.name,
    position: u.playing ? u.position + Math.max(0, now - (u.progressUpdatedAt || now)) / 1000 : u.position,
    playing: u.playing,
    duration: u.duration || 0
  }));
}
function broadcastRoom(roomId) { const room = rooms.get(roomId); if (room) io.to(roomId).emit("room-users", publicUsers(room)); }

function joinRoomForSocket(socket, { roomId, name, privateRoom, accessToken } = {}) {
  roomId = String(roomId || "").trim().toUpperCase().slice(0, 16);
  name = String(name || "Гость").trim().slice(0, 24);
  privateRoom = !!privateRoom;
  accessToken = String(accessToken || "").trim().slice(0, 96);

  if (!roomId) return { ok:false, error:"Не указан код комнаты." };

  const room = roomState(roomId);
  if (room.isPrivate) {
    if (!accessToken || accessToken !== room.accessToken) {
      return { ok:false, error:"Эта комната приватная. Нужна персональная ссылка-приглашение." };
    }
  } else if (privateRoom) {
    if (!accessToken) return { ok:false, error:"Не найден ключ приватного приглашения." };
    room.isPrivate = true;
    room.accessToken = accessToken;
  }

  if (socket.data.roomId && socket.data.roomId !== roomId) socket.leave(socket.data.roomId);
  socket.join(roomId);
  socket.data.roomId = roomId;
  socket.data.name = name;
  room.emptySince = null;

  if (!room.hostId) room.hostId = socket.id;
  const existing = room.users.get(socket.id);
  room.users.set(socket.id, {
    id: socket.id,
    name,
    position: existing?.position ?? (room.playing ? room.position + (Date.now() - room.updatedAt) / 1000 : room.position),
    playing: existing?.playing ?? room.playing,
    progressUpdatedAt: Date.now(),
    duration: existing?.duration || 0,
    voiceEnabled: !!existing?.voiceEnabled
  });

  socket.emit("voice-peer-list", [...room.users.values()].map(u => ({
    id:u.id, name:u.name, voiceEnabled:!!u.voiceEnabled
  })));
  socket.emit("room-state", {
    hostId: room.hostId,
    playing: room.playing,
    position: room.playing ? room.position + (Date.now() - room.updatedAt) / 1000 : room.position,
    serverTime: Date.now(),
    mediaUrl: room.mediaUrl
  });
  if (room.messages.length) socket.emit("chat-history", room.messages.slice(-100));
  broadcastRoom(roomId);
  socket.emit("room-users", publicUsers(room));
  io.to(roomId).emit("voice-user-state", {
    users: [...room.users.values()].map(u => ({
      id:u.id, name:u.name, voiceEnabled:!!u.voiceEnabled
    }))
  });

  return { ok:true, roomId };
}

io.on("connection", socket => {
  const initialRoom = String(socket.handshake.auth?.roomId || socket.handshake.query?.roomId || "").trim();
  if (initialRoom) {
    const result = joinRoomForSocket(socket, {
      roomId: initialRoom,
      name: socket.handshake.auth?.name || socket.handshake.query?.name || "Гость",
      privateRoom: socket.handshake.auth?.privateRoom === true || socket.handshake.auth?.privateRoom === "1" || socket.handshake.query?.privateRoom === "1",
      accessToken: socket.handshake.auth?.accessToken || socket.handshake.query?.accessToken || ""
    });
    if (result.ok) {
      socket.emit("room-joined", result);
    } else {
      socket.emit("room-access-denied", result);
    }
  }
  socket.on("create-room", ({ roomId }, ack) => {
    const cleanRoom = String(roomId || "").trim().toUpperCase().slice(0, 16);
    if (!cleanRoom) { if (typeof ack === "function") ack({ ok: false, error: "Не удалось создать комнату." }); return; }
    roomState(cleanRoom);
    if (typeof ack === "function") ack({ ok: true, roomId: cleanRoom });
  });
  socket.on("voice-state", ({ enabled }) => {
    const roomId = socket.data.roomId; if (!roomId) return;
    const room = rooms.get(roomId); if (!room) return;
    const user = room.users.get(socket.id); if (!user) return;
    user.voiceEnabled = !!enabled;
    io.to(roomId).emit("voice-user-state", { users: [...room.users.values()].map(u => ({ id:u.id, name:u.name, voiceEnabled:!!u.voiceEnabled })) });
  });
  socket.on("voice-signal", ({ to, data }) => {
    const roomId = socket.data.roomId;
    const target = io.sockets.sockets.get(String(to || ""));
    if (!roomId || !target || target.data.roomId !== roomId || !data) return;
    socket.to(target.id).emit("voice-signal", { from: socket.id, name: socket.data.name || "Гость", data });
  });

  socket.on("join-room", ({ roomId, name, privateRoom, accessToken }, ack) => {
    const result = joinRoomForSocket(socket, { roomId, name, privateRoom, accessToken });
    if (typeof ack === "function") ack(result);
    if (result.ok) socket.emit("room-joined", result);
  });
  socket.on("rename", ({ name }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomState(roomId);
    const clean = String(name || "").trim().slice(0, 24);
    if (!clean) return;
    socket.data.name = clean;
    const user = room.users.get(socket.id);
    if (user) user.name = clean;
    broadcastRoom(roomId);
    io.to(roomId).emit("voice-user-state", { users: [...room.users.values()].map(u => ({ id:u.id, name:u.name, voiceEnabled:!!u.voiceEnabled })) });
  });
  socket.on("set-media", ({ url }) => {
    const roomId = socket.data.roomId; if (!roomId) return;
    const room = roomState(roomId);
    room.mediaUrl = String(url || "").trim();
    room.playing = false;
    room.position = 0;
    room.updatedAt = Date.now();
    for (const u of room.users.values()) {
      u.position = 0;
      u.playing = false;
      u.progressUpdatedAt = room.updatedAt;
    }
    io.to(roomId).emit("media-changed", {
      url: room.mediaUrl,
      playing: false,
      position: 0,
      serverTime: room.updatedAt
    });
    broadcastRoom(roomId);
  });
  socket.on("sync", ({ playing, position }) => {
    const roomId = socket.data.roomId; if (!roomId) return;
    const room = roomState(roomId);
    room.playing = !!playing;
    room.position = Math.max(0, Number(position) || 0);
    room.updatedAt = Date.now();
    room.emptySince = null;
    const user = room.users.get(socket.id);
    if (user) { user.position = room.position; user.playing = room.playing; user.progressUpdatedAt = Date.now(); }
    socket.to(roomId).emit("sync", { playing: room.playing, position: room.position, serverTime: room.updatedAt });
    io.to(roomId).emit("room-host", { hostId: room.hostId });
    broadcastRoom(roomId);
  });
  socket.on("request-room-state", () => {
    const roomId = socket.data.roomId; if (!roomId) return;
    const room = roomState(roomId);
    const now = Date.now();
    const position = room.playing ? room.position + (now - room.updatedAt) / 1000 : room.position;
    socket.emit("room-state", {
      hostId: room.hostId,
      playing: room.playing,
      position: Math.max(0, position),
      serverTime: now,
      mediaUrl: room.mediaUrl
    });
  });
  socket.on("request-sync", () => {
    const roomId = socket.data.roomId; if (!roomId) return;
    const room = roomState(roomId);
    const position = room.playing
      ? room.position + (Date.now() - room.updatedAt) / 1000
      : room.position;
    socket.emit("sync-state", {
      playing: room.playing,
      position: Math.max(0, position),
      serverTime: Date.now()
    });
  });
  socket.on("user-progress", ({ position, playing, duration }) => { const roomId = socket.data.roomId; if (!roomId) return; const room = roomState(roomId); const user = room.users.get(socket.id); if (!user) return; user.position = Math.max(0, Number(position) || 0); user.playing = !!playing; user.progressUpdatedAt = Date.now(); user.duration = Math.max(0, Number(duration) || 0); socket.to(roomId).emit("user-progress", { id: socket.id, position: user.position, playing: user.playing }); broadcastRoom(roomId); });
  socket.on("chat-message", (payload, ack) => {
    const roomId = socket.data.roomId;
    if (!roomId) { if (typeof ack === "function") ack({ ok: false, error: "Вы ещё не вошли в комнату." }); return; }
    const room = roomState(roomId);
    const clean = String(payload?.text || "").trim().slice(0, 500);
    if (!clean) { if (typeof ack === "function") ack({ ok: false, error: "Пустое сообщение." }); return; }
    const blocked = /(?:\bnazi\b|\bнацист\w*|\bнеонацист\w*|\bфашист\w*|\bгитлер\w*|\bсвастик\w*|\bss[- ]?символ\w*|\bрасист\w*|\bрасизм\w*)/iu;
    if (blocked.test(clean)) {
      if (typeof ack === "function") ack({ ok: false, blocked: true, error: "Сообщение заблокировано: CINEORA не пропускает нацистский, расистский и экстремистский контент." });
      socket.emit("chat-warning", { text: "⚠️ Сообщение не отправлено. Нацистский и расистский контент в чате запрещён." });
      return;
    }
    const message = {
      id: socket.id + "-" + Date.now(),
      userId: socket.id,
      name: socket.data.name || "Гость",
      text: clean,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    room.messages.push(message);
    if (room.messages.length > 100) room.messages.splice(0, room.messages.length - 100);
    io.to(roomId).emit("chat-message", message);
    if (typeof ack === "function") ack({ ok: true });
  });
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId; if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    room.users.delete(socket.id);
    socket.to(roomId).emit("voice-peer-left", socket.id);
    io.to(roomId).emit("voice-user-state", { users: [...room.users.values()].map(u => ({ id:u.id, name:u.name, voiceEnabled:!!u.voiceEnabled })) });
    if (room.hostId === socket.id) {
      const next = room.users.values().next().value;
      room.hostId = next ? next.id : null;
      if (room.hostId) io.to(roomId).emit("room-host", { hostId: room.hostId });
    }
    broadcastRoom(roomId);
    if (!room.users.size) room.emptySince = Date.now();
  });
});

setInterval(()=>{
  const cutoff=Date.now()-30*60*1000;
  for(const [id,room] of rooms){
    if(!room.users.size && room.emptySince && room.emptySince<cutoff)rooms.delete(id);
  }
},5*60*1000);

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CINEORA running on port ${PORT}`);
});

async function startServer() {
  try {
    await initDatabase();
    console.log("PostgreSQL initialization completed.");
  } catch (err) {
    console.error("PostgreSQL initialization failed. CINEORA will continue without database:", err.message);
  }

  // Nodemailer v7 can throw when the callback-style verify API is used
  // with an options object. SMTP verification is not required for CINEORA
  // to serve pages or rooms, and sendMail already has its own error handling.
  // Keep startup independent from SMTP availability.
  if (mailer) {
    console.log("SMTP configured; email notifications will be checked when a message is sent.");
  } else {
    console.warn("SMTP is not configured. Email notifications are disabled.");
  }
}

startServer().catch(err => {
  console.error("Unexpected CINEORA startup error:", err);
});
