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

// Permanent user suggestions storage via PostgreSQL.
const { Pool } = require("pg");

const smtpUser = String(process.env.SMTP_USER || "").trim();
const smtpPass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
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

    // Email notification is secondary: a mail failure must not undo the saved suggestion.
    if (mailer) {
      try {
        await mailer.sendMail({
          from: smtpUser,
          to: String(process.env.ADMIN_EMAIL || smtpUser).trim(),
          subject: "Новое предложение для CINEORA",
          text: [
            "Новое предложение для CINEORA",
            "",
            `Имя: ${name || "Гость"}`,
            "",
            text
          ].join("\n")
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

app.get("/admin", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CINEORA — Админ-панель</title>
<style>
:root{--bg:#f3efe5;--paper:#fffdf8;--ink:#25251f;--muted:#77736b;--line:#e2dbcf;--lime:#d8efb7;--dark:#292a23;--red:#a94d4d;--green:#65804e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,sans-serif}.wrap{width:min(1180px,calc(100% - 36px));margin:34px auto}.top{display:flex;justify-content:space-between;align-items:center;gap:20px}.logo{font:500 32px Georgia;letter-spacing:.12em}.logo span{color:#7c9560}.top a{color:#555;text-decoration:none}.login,.dashboard{margin-top:24px;background:var(--paper);border:1px solid var(--line);border-radius:22px;padding:25px}.login{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.login input{padding:13px 14px;border:1px solid #cfc7b8;border-radius:11px;min-width:280px}.btn{padding:12px 18px;border:0;border-radius:999px;background:var(--lime);cursor:pointer;font-weight:700}.error{color:var(--red);margin:12px 0 0}.dashboard{display:none}.dashboard.show{display:block}.tabs{display:flex;gap:8px;margin:20px 0;border-bottom:1px solid var(--line);padding-bottom:10px}.tab{border:1px solid var(--line);background:white;border-radius:999px;padding:10px 16px;cursor:pointer}.tab.active{background:var(--dark);color:white}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.stat{background:#f7f3ea;border:1px solid var(--line);border-radius:16px;padding:18px}.stat b{display:block;font-size:28px;margin-top:5px}.stat span{font-size:12px;color:var(--muted)}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}.toolbar input,.toolbar select{padding:12px 14px;border:1px solid var(--line);border-radius:11px;background:white}.toolbar input{flex:1;min-width:220px}.cards{display:grid;gap:12px}.idea,.news{border:1px solid var(--line);border-radius:17px;padding:19px;background:white}.idea-head,.news-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.person{font-weight:700}.date{font-size:12px;color:var(--muted);margin-top:5px}.idea-text,.news-text{font-size:16px;line-height:1.6;margin:15px 0;white-space:pre-wrap;overflow-wrap:anywhere}.idea-actions,.news-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.status{padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:#faf8f2}.delete{border:0;background:#f2e8e1;color:#8c4848;padding:9px 13px;border-radius:999px;cursor:pointer}.empty{text-align:center;padding:45px;color:var(--muted)}.count{font-size:13px;color:var(--muted)}.editor{border:1px solid var(--line);background:#f7f3ea;border-radius:18px;padding:18px;margin:20px 0}.editor h2{font:500 25px Georgia;margin:0 0 12px}.editor input,.editor textarea{width:100%;padding:13px;border:1px solid var(--line);border-radius:11px;background:white;margin:5px 0 10px}.editor textarea{min-height:120px;resize:vertical}.editor-row{display:flex;justify-content:space-between;gap:15px;align-items:center;flex-wrap:wrap}.check{font-size:14px;color:var(--muted)}.published{font-size:12px;color:var(--green);font-weight:700}.unpublished{font-size:12px;color:#8c6f45;font-weight:700}.news-edit{display:grid;gap:8px;margin-top:14px}.news-edit input,.news-edit textarea{width:100%;padding:11px;border:1px solid var(--line);border-radius:10px;background:#faf8f2}.news-edit textarea{min-height:100px;resize:vertical}.smallbtn{padding:9px 13px;border:1px solid var(--line);border-radius:999px;background:white;cursor:pointer}.smallbtn.primary{background:var(--lime);border-color:var(--lime);font-weight:700}.smallbtn.danger{color:#8c4848;background:#f2e8e1;border:0}
@media(max-width:800px){.stats{grid-template-columns:repeat(2,1fr)}.wrap{width:calc(100% - 24px)}}@media(max-width:500px){.stats{grid-template-columns:1fr}.idea-head,.news-head{display:block}.tabs{overflow:auto}}
</style></head>
<body><div class="wrap">
<div class="top"><div class="logo">CINE<span>ORA</span></div><a href="/">На сайт →</a></div>
<div class="login" id="loginBox"><input id="pass" type="password" placeholder="Пароль администратора"><button class="btn" onclick="openAdmin()">Открыть админ-панель</button><div id="loginStatus"></div></div>
<section class="dashboard" id="dashboard">
<div style="display:flex;justify-content:space-between;gap:20px;align-items:end;flex-wrap:wrap"><div><h1 style="font:500 36px Georgia;margin:0 0 7px">Панель управления CINEORA</h1><div class="count">Предложения пользователей и новости сервиса</div></div><button class="btn" onclick="refreshAll()">↻ Обновить</button></div>
<div class="tabs"><button class="tab active" id="tabIdeas" onclick="showTab('ideas')">Предложения</button><button class="tab" id="tabNews" onclick="showTab('news')">Обновления сайта</button></div>
<div id="ideasPanel">
<div class="stats"><div class="stat"><span>Всего</span><b id="all">0</b></div><div class="stat"><span>Новые</span><b id="new">0</b></div><div class="stat"><span>В работе</span><b id="progress">0</b></div><div class="stat"><span>Добавлено</span><b id="done">0</b></div></div>
<div class="toolbar"><input id="search" placeholder="Поиск по имени или предложению..." oninput="renderIdeas()"><select id="filter" onchange="renderIdeas()"><option value="all">Все предложения</option><option value="new">Новые</option><option value="in_progress">В работе</option><option value="done">Добавлено</option><option value="rejected">Отклонено</option></select></div>
<div class="cards" id="list"></div></div>
<div id="newsPanel" style="display:none">
<div class="editor"><h2>Опубликовать обновление</h2><input id="newsTitle" maxlength="140" placeholder="Заголовок, например: «Добавили RUTUBE»"><textarea id="newsText" maxlength="3000" placeholder="Расскажите пользователям, что нового появилось в CINEORA."></textarea><div class="editor-row"><label class="check"><input type="checkbox" id="newsPublished" checked> Показывать на главной странице</label><button class="btn" onclick="createNews()">Опубликовать</button></div><div id="newsStatus" class="count"></div></div>
<div class="cards" id="newsList"></div></div>
</section></div>
<script>
let password="",items=[],newsItems=[];
const labels={new:'Новое',in_progress:'В работе',done:'Добавлено',rejected:'Отклонено'};
function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
async function openAdmin(){password=document.getElementById('pass').value;await refreshAll()}
async function api(path,options={}){options.headers={...(options.headers||{}),'x-admin-password':password};const r=await fetch(path,options);const d=await r.json();if(!r.ok)throw new Error(d.error||'Ошибка');return d}
async function refreshAll(){if(!password){document.getElementById('loginStatus').className='error';document.getElementById('loginStatus').textContent='Введите пароль.';return}try{const [a,b]=await Promise.all([api('/api/admin/suggestions'),api('/api/admin/news')]);items=a.suggestions||[];newsItems=b.news||[];document.getElementById('loginStatus').textContent='';document.getElementById('dashboard').classList.add('show');renderIdeas();renderNews()}catch(e){document.getElementById('loginStatus').className='error';document.getElementById('loginStatus').textContent=e.message}}
function showTab(tab){document.getElementById('ideasPanel').style.display=tab==='ideas'?'block':'none';document.getElementById('newsPanel').style.display=tab==='news'?'block':'none';document.getElementById('tabIdeas').classList.toggle('active',tab==='ideas');document.getElementById('tabNews').classList.toggle('active',tab==='news')}
function renderIdeas(){const filter=document.getElementById('filter').value,term=document.getElementById('search').value.trim().toLowerCase();const filtered=items.filter(x=>(filter==='all'||x.status===filter)&&(!term||(x.name+' '+x.text).toLowerCase().includes(term)));document.getElementById('all').textContent=items.length;document.getElementById('new').textContent=items.filter(x=>x.status==='new').length;document.getElementById('progress').textContent=items.filter(x=>x.status==='in_progress').length;document.getElementById('done').textContent=items.filter(x=>x.status==='done').length;const list=document.getElementById('list');if(!filtered.length){list.innerHTML='<div class="empty">По выбранному фильтру предложений нет.</div>';return}list.innerHTML=filtered.map(x=>\`<article class="idea"><div class="idea-head"><div><div class="person">\${esc(x.name||'Гость')}</div><div class="date">\${new Date(x.createdAt).toLocaleString('ru-RU')}</div></div><strong>\${esc(labels[x.status]||x.status)}</strong></div><div class="idea-text">\${esc(x.text)}</div><div class="idea-actions"><select class="status" onchange="changeStatus('\${x.id}',this.value)">\${Object.entries(labels).map(([k,v])=>\`<option value="\${k}" \${x.status===k?'selected':''}>\${v}</option>\`).join('')}</select><button class="delete" onclick="removeItem('\${x.id}')">Удалить</button></div></article>\`).join('')}
async function changeStatus(id,status){try{await api('/api/admin/suggestions/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});const x=items.find(i=>i.id===id);if(x)x.status=status;renderIdeas()}catch(e){alert(e.message)}}
async function removeItem(id){if(!confirm('Удалить это предложение?'))return;try{await api('/api/admin/suggestions/'+encodeURIComponent(id),{method:'DELETE'});items=items.filter(x=>x.id!==id);renderIdeas()}catch(e){alert(e.message)}}
async function createNews(){const title=document.getElementById('newsTitle').value.trim(),text=document.getElementById('newsText').value.trim(),published=document.getElementById('newsPublished').checked;const status=document.getElementById('newsStatus');if(!title||!text){status.textContent='Заполните заголовок и текст.';return}status.textContent='Сохраняем...';try{const d=await api('/api/admin/news',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,text,published})});newsItems.unshift(d.item);document.getElementById('newsTitle').value='';document.getElementById('newsText').value='';status.textContent='Обновление опубликовано.';renderNews()}catch(e){status.textContent=e.message}}
function renderNews(){const list=document.getElementById('newsList');if(!newsItems.length){list.innerHTML='<div class="empty">Пока нет обновлений. Создайте первое выше.</div>';return}list.innerHTML=newsItems.map(x=>\`<article class="news"><div class="news-head"><div><div class="date">\${new Date(x.createdAt).toLocaleString('ru-RU')}</div></div><span class="\${x.published?'published':'unpublished'}">\${x.published?'Опубликовано':'Скрыто'}</span></div><div class="news-edit"><input id="nt-\${x.id}" value="\${esc(x.title)}" maxlength="140"><textarea id="nx-\${x.id}" maxlength="3000">\${esc(x.text)}</textarea><div class="news-actions"><label class="check"><input id="np-\${x.id}" type="checkbox" \${x.published?'checked':''}> Показывать на сайте</label><button class="smallbtn primary" onclick="saveNews('\${x.id}')">Сохранить</button><button class="smallbtn danger" onclick="deleteNews('\${x.id}')">Удалить</button></div></div></article>\`).join('')}
async function saveNews(id){try{const item={title:document.getElementById('nt-'+id).value.trim(),text:document.getElementById('nx-'+id).value.trim(),published:document.getElementById('np-'+id).checked};const d=await api('/api/admin/news/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});const i=newsItems.findIndex(x=>x.id===id);if(i>=0)newsItems[i]=d.item;renderNews()}catch(e){alert(e.message)}}
async function deleteNews(id){if(!confirm('Удалить это обновление?'))return;try{await api('/api/admin/news/'+encodeURIComponent(id),{method:'DELETE'});newsItems=newsItems.filter(x=>x.id!==id);renderNews()}catch(e){alert(e.message)}}
document.getElementById('pass').addEventListener('keydown',e=>{if(e.key==='Enter')openAdmin()});
</script></body></html>`);
});

const rooms = new Map();
function roomState(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, { users: new Map(), hostId: null, playing: false, position: 0, updatedAt: Date.now(), mediaUrl: "", messages: [] });
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

io.on("connection", socket => {
  socket.on("join-room", ({ roomId, name }) => {
    roomId = String(roomId || "").trim().toUpperCase().slice(0, 16);
    name = String(name || "Гость").trim().slice(0, 24);
    if (!roomId) return;
    const room = roomState(roomId); socket.join(roomId); socket.data.roomId = roomId; socket.data.name = name;
    if (!room.hostId) room.hostId = socket.id;
    room.users.set(socket.id, { id: socket.id, name, position: room.playing ? room.position + (Date.now() - room.updatedAt) / 1000 : room.position, playing: room.playing, progressUpdatedAt: Date.now(), duration: 0 });
    socket.emit("room-state", { hostId: room.hostId, playing: room.playing, position: room.playing ? room.position + (Date.now() - room.updatedAt) / 1000 : room.position, serverTime: Date.now(), mediaUrl: room.mediaUrl });
    if (room.messages.length) socket.emit("chat-history", room.messages.slice(-100));
    broadcastRoom(roomId);
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
  });
  socket.on("set-media", ({ url }) => {
    const roomId = socket.data.roomId; if (!roomId) return;
    const room = roomState(roomId);
    room.mediaUrl = String(url || "").trim();
    room.playing = false;
    room.position = 0;
    room.updatedAt = Date.now();
    io.to(roomId).emit("media-changed", { url: room.mediaUrl, playing: false, position: 0, serverTime: Date.now() });
  });
  socket.on("sync", ({ playing, position }) => {
    const roomId = socket.data.roomId; if (!roomId) return;
    const room = roomState(roomId);
    room.hostId = socket.id;
    room.playing = !!playing;
    room.position = Math.max(0, Number(position) || 0);
    room.updatedAt = Date.now();
    const user = room.users.get(socket.id);
    if (user) { user.position = room.position; user.playing = room.playing; user.progressUpdatedAt = Date.now(); }
    socket.to(roomId).emit("sync", { playing: room.playing, position: room.position, serverTime: room.updatedAt });
    io.to(roomId).emit("room-host", { hostId: room.hostId });
    broadcastRoom(roomId);
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
    if (room.hostId === socket.id) {
      const next = room.users.values().next().value;
      room.hostId = next ? next.id : null;
      if (room.hostId) io.to(roomId).emit("room-host", { hostId: room.hostId });
    }
    broadcastRoom(roomId);
    if (!room.users.size) rooms.delete(roomId);
  });
});

const PORT = process.env.PORT || 3000;
initDatabase()
  .then(async () => {
    if (mailer) {
      try {
        await mailer.verify();
        console.log("SMTP connection verified.");
      } catch (err) {
        console.error("SMTP verification failed:", err.message);
      }
    } else {
      console.warn("SMTP is not configured. Email notifications are disabled.");
    }
    server.listen(PORT, "0.0.0.0", () => console.log(`CINEORA running on port ${PORT}`));
  })
  .catch(err => { console.error("Database initialization failed:", err); process.exit(1); });
