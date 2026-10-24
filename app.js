// ======================================================
//  Focus: tasks with reminders. No login, no backend.
//  Tasks live in this browser (localStorage).
//  Phone notifications use ntfy.sh scheduled delivery.
// ====================================================== 

const KEY = "focus-tasks-v1";
const SKEY = "focus-settings-v1";
const NTFY = "https://ntfy.sh";
const MAX_AHEAD = 71 * 3600; // ntfy can schedule at most 3 days ahead (we stay just under)

const $ = (id) => document.getElementById(id);
const read = (k, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; }
  catch (e) { return fallback; }
};

let tasks = read(KEY, []);
let settings = read(SKEY, { topic: "", theme: "auto" });
let filter = "all";
let editing = null;          // task id, or "new"
let priority = "medium";
let lastDeleted = null;
const busy = new Set();      // tasks being sent to ntfy right now
const seen = new Set();      // tasks that already played their entrance animation

const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const saveTasks = () => { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch (e) {} };
const saveSettings = () => { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) {} };

// ---------- small helpers ----------
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const todayStr = () => ymd(new Date());
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return ymd(d); };
const uid = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return ymd(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
};
const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
function dayLabel(s) {
  if (s === todayStr()) return "Today";
  if (s === tomorrowStr()) return "Tomorrow";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: "short", day: "numeric" });
}
function reminderLabel(iso) {
  return dayLabel(ymd(new Date(iso))) + ", " + fmtTime(iso);
}
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function buzz() { try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {} }

const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
const ICON_BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg>';
const THEME_ICONS = {
  auto: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18z" fill="currentColor"/></svg>',
  light: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>'
};

// ---------- toast ----------
let toastTimer;
function toast(text, actionLabel, action) {
  $("toastText").textContent = text;
  const b = $("toastAct");
  b.hidden = !actionLabel;
  b.textContent = actionLabel || "";
  b.onclick = () => { if (action) action(); $("toast").classList.remove("show"); };
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), actionLabel ? 6000 : 3500);
}

// ---------- theme (auto / light / dark) ----------
function applyTheme() {
  const t = settings.theme || "auto";
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  $("themeBtn").innerHTML = THEME_ICONS[t];
  $("themeBtn").setAttribute("aria-label", "Theme: " + t + ". Tap to change");
}
$("themeBtn").onclick = () => {
  const order = ["auto", "light", "dark"];
  settings.theme = order[(order.indexOf(settings.theme || "auto") + 1) % 3];
  saveSettings();
  applyTheme();
  toast("Theme: " + settings.theme);
};

// ---------- confetti ----------
function burst(target) {
  if (reduceMotion || !target) return;
  const r = target.getBoundingClientRect();
  const box = el("div", "confetti");
  box.style.left = r.left + r.width / 2 + "px";
  box.style.top = r.top + r.height / 2 + "px";
  const colors = ["#5b4bff", "#8a5bff", "#22c08a", "#f5a623", "#ff5d73", "#5ee6ff"];
  for (let i = 0; i < 18; i++) {
    const p = el("i");
    const a = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
    const d = 40 + Math.random() * 46;
    p.style.setProperty("--x", Math.cos(a) * d + "px");
    p.style.setProperty("--y", Math.sin(a) * d + "px");
    p.style.setProperty("--r", Math.random() * 540 - 270 + "deg");
    p.style.setProperty("--c", colors[i % colors.length]);
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 900);
}

// ======================================================
//  PHONE NOTIFICATIONS (ntfy.sh)
// ======================================================
function newTopic() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return "focus-" + Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
}

async function ntfySchedule(t, secs) {
  const headers = { Title: "Task reminder", Tags: "alarm_clock", Priority: "4", "X-Sequence-ID": t.id };
  if (secs >= 15) headers.Delay = String(Math.floor(new Date(t.remindAt).getTime() / 1000));
  if (location.protocol === "https:") headers.Click = location.origin + location.pathname;
  try {
    const res = await fetch(NTFY + "/" + settings.topic, {
      method: "POST",
      headers,
      body: t.title + (t.notes ? "\n" + t.notes : "")
    });
    return res.ok;
  } catch (e) { return false; }
}

async function ntfyCancel(id) {
  if (!settings.topic) return;
  try { await fetch(NTFY + "/" + settings.topic + "/" + id, { method: "DELETE" }); } catch (e) {}
}

function cancelRemote(t) {
  if (t.scheduled) { t.scheduled = false; ntfyCancel(t.id); }
}

// Sends any upcoming reminder to ntfy (runs on load and every 30 seconds).
async function syncReminders() {
  if (!settings.topic) return;
  for (const t of tasks) {
    if (t.done || t.fired || t.scheduled || !t.remindAt || busy.has(t.id)) continue;
    const secs = (new Date(t.remindAt).getTime() - Date.now()) / 1000;
    if (secs <= 0 || secs > MAX_AHEAD) continue;
    busy.add(t.id);
    const ok = await ntfySchedule(t, secs);
    busy.delete(t.id);
    if (ok) {
      t.scheduled = true;
      saveTasks();
      // Update the bell tag in place so an entrance animation is not interrupted
      const tag = document.querySelector('.card[data-id="' + t.id + '"] .tag[data-rem]');
      if (tag) { tag.classList.add("sent"); tag.title = "Scheduled on your phone"; }
    }
  }
}

// ======================================================
//  BROWSER NOTIFICATIONS + IN-APP ALERT
// ======================================================
async function showBrowserNotification(t) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body: t.notes || "Time to get this done.", icon: "icons/icon-192.png", tag: t.id };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) reg.showNotification(t.title, opts);
    else new Notification(t.title, opts);
  } catch (e) {}
}

function checkDue() {
  const now = Date.now();
  const due = [];
  tasks.forEach((t) => {
    if (t.done || t.fired || !t.remindAt) return;
    if (new Date(t.remindAt).getTime() <= now) {
      t.fired = true;
      due.push(t);
      if (!t.scheduled) showBrowserNotification(t); // scheduled ones already reach the phone
    }
  });
  if (due.length) {
    saveTasks();
    render();
    buzz();
    toast(due.length === 1 ? "Reminder: " + due[0].title : due.length + " reminders are due");
  }
}

// ======================================================
//  DRAWING THE SCREEN
// ======================================================
function inFilter(t) {
  const today = todayStr();
  if (filter === "done") return t.done;
  if (filter === "today") return !t.done && t.due && t.due <= today;
  if (filter === "upcoming") return !t.done && t.due && t.due > today;
  return true;
}

function sorted(list) {
  const order = { high: 0, medium: 1, low: 2 };
  return list.slice().sort((a, b) =>
    (a.done - b.done) ||
    (a.due || "9999").localeCompare(b.due || "9999") ||
    (order[a.priority] - order[b.priority]) ||
    (b.created - a.created));
}

function nextReminder() {
  const now = Date.now();
  return tasks
    .filter((t) => !t.done && t.remindAt && new Date(t.remindAt).getTime() > now)
    .sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt))[0];
}

// Animated percentage in the progress ring
let shownPct = 0, pctToken = 0;
function setPct(target) {
  const from = shownPct;
  shownPct = target;
  $("ringFg").style.strokeDashoffset = String(213.63 * (1 - target / 100));
  if (reduceMotion || from === target) { $("pct").textContent = target + "%"; return; }
  const my = ++pctToken, start = performance.now(), dur = 700;
  (function step(now) {
    if (my !== pctToken) return;
    const p = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    $("pct").textContent = Math.round(from + (target - from) * e) + "%";
    if (p < 1) requestAnimationFrame(step);
  })(start);
}

function renderHeader() {
  const today = todayStr();
  const total = tasks.length;
  const doneN = tasks.filter((t) => t.done).length;
  const left = total - doneN;

  const h = new Date().getHours();
  $("greeting").textContent = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  $("today").textContent = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  setPct(total ? Math.round((doneN / total) * 100) : 0);
  if (!total) {
    $("heroTitle").textContent = "Nothing planned yet";
    $("heroSub").textContent = "Tap + to add your first task";
  } else if (!left) {
    $("heroTitle").textContent = "All done. Nice work!";
    $("heroSub").textContent = doneN + (doneN === 1 ? " task" : " tasks") + " completed";
  } else {
    $("heroTitle").textContent = left + (left === 1 ? " task left" : " tasks left");
    $("heroSub").textContent = doneN + " of " + total + " completed";
  }

  const next = nextReminder();
  $("heroNext").hidden = !next;
  if (next) {
    $("heroNext").innerHTML = ICON_BELL;
    $("heroNext").append("Next: " + reminderLabel(next.remindAt));
  }

  $("nAll").textContent = total;
  $("nToday").textContent = tasks.filter((t) => !t.done && t.due && t.due <= today).length;
  $("nUp").textContent = tasks.filter((t) => !t.done && t.due && t.due > today).length;
  $("nDone").textContent = doneN;

  $("bellDot").hidden = !!settings.topic;
  $("fab").classList.toggle("pulse", total === 0);
}

function renderList() {
  const today = todayStr();
  const total = tasks.length;
  const list = $("list");
  list.innerHTML = "";
  const shown = sorted(tasks.filter(inFilter));
  $("empty").hidden = shown.length > 0;
  if (!shown.length) {
    $("emptyText").textContent = !total ? "No tasks yet. Tap + to add one."
      : filter === "done" ? "Nothing completed yet."
      : filter === "today" ? "Nothing due today. Enjoy the calm."
      : filter === "upcoming" ? "No upcoming tasks with a due date."
      : "No tasks here.";
  }

  let n = 0;
  shown.forEach((t) => {
    const li = el("li", "card p-" + t.priority + (t.done ? " done" : ""));
    li.dataset.id = t.id;
    if (!seen.has(t.id)) {
      li.classList.add("enter");
      li.style.setProperty("--i", Math.min(n++, 8));
      seen.add(t.id);
    }

    const check = el("button", "check");
    check.innerHTML = ICON_CHECK;
    check.setAttribute("aria-label", t.done ? "Mark as not done" : "Mark as done");
    check.onclick = () => toggle(t.id);

    const main = el("button", "card-main");
    main.onclick = () => openTask(t.id);
    main.appendChild(el("span", "t", t.title));
    if (t.notes) main.appendChild(el("div", "n", t.notes));

    const meta = el("div", "meta");
    if (t.due) {
      const late = !t.done && t.due < today;
      const tag = el("span", "tag" + (late ? " late" : ""));
      tag.innerHTML = ICON_CAL;
      tag.append(late ? "Overdue, " + dayLabel(t.due) : dayLabel(t.due));
      meta.appendChild(tag);
    }
    if (t.remindAt) {
      const tag = el("span", "tag" + (t.scheduled && !t.fired ? " sent" : ""));
      tag.dataset.rem = "1";
      tag.innerHTML = ICON_BELL;
      tag.append(reminderLabel(t.remindAt));
      if (t.scheduled && !t.fired) tag.title = "Scheduled on your phone";
      meta.appendChild(tag);
    }
    if (meta.children.length) main.appendChild(meta);

    li.append(check, main);
    list.appendChild(li);
  });
}

function render() { renderHeader(); renderList(); }

// ======================================================
//  ACTIONS
// ======================================================
function toggle(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  if (t.done) cancelRemote(t);
  saveTasks();
  renderHeader();
  if (t.done) {
    buzz();
    const li = document.querySelector('.card[data-id="' + id + '"]');
    if (li && !reduceMotion) {
      li.classList.add("done", "celebrate");   // plays the check animation
      burst(li.querySelector(".check"));
      setTimeout(renderList, 650);              // then move it to its new place
    } else renderList();
  } else {
    renderList();
    syncReminders();
  }
}

function removeTask(id) {
  const li = document.querySelector('.card[data-id="' + id + '"]');
  const finish = () => {
    const i = tasks.findIndex((x) => x.id === id);
    if (i < 0) return;
    const t = tasks[i];
    cancelRemote(t);
    tasks.splice(i, 1);
    lastDeleted = { t, i };
    saveTasks();
    render();
    toast("Task deleted", "Undo", () => {
      if (!lastDeleted) return;
      lastDeleted.t.scheduled = false;
      seen.delete(lastDeleted.t.id);
      tasks.splice(lastDeleted.i, 0, lastDeleted.t);
      lastDeleted = null;
      saveTasks();
      render();
      syncReminders();
    });
  };
  if (li && !reduceMotion) {
    li.style.maxHeight = li.offsetHeight + "px";
    void li.offsetHeight;                       // lets the browser start the collapse from this height
    li.classList.add("leaving");
    setTimeout(finish, 290);
  } else finish();
}

function saveSheet() {
  const title = $("fTitle").value.trim();
  if (!title) { toast("Give your task a name"); $("fTitle").focus(); return; }
  const remindVal = $("fRemind").value;
  const remindAt = remindVal ? new Date(remindVal).toISOString() : "";
  const existing = editing !== "new" ? tasks.find((x) => x.id === editing) : null;

  const remindChanged = !existing || existing.remindAt !== remindAt;
  if (remindAt && remindChanged && new Date(remindAt).getTime() <= Date.now()) {
    toast("That reminder time has already passed");
    return;
  }

  const data = { title, notes: $("fNotes").value.trim(), priority, due: $("fDue").value, remindAt };
  if (existing) {
    cancelRemote(existing);
    if (remindChanged) existing.fired = false;
    Object.assign(existing, data);
  } else {
    tasks.unshift(Object.assign({ id: uid(), done: false, created: Date.now(), scheduled: false, fired: false }, data));
  }
  saveTasks();
  closeLayers();
  render();
  syncReminders();

  const noAlerts = !settings.topic && !("Notification" in window && Notification.permission === "granted");
  if (remindAt && noAlerts) {
    toast("Turn on notifications to get this reminder", "Set up", openSettings);
  }
}

// ======================================================
//  SHEETS (add/edit task + settings)
// ======================================================
function showLayer(id) {
  const s = $(id);
  clearTimeout(s._t);
  $("backdrop").hidden = false;
  s.hidden = false;
  document.body.classList.add("lock");
  requestAnimationFrame(() => { $("backdrop").classList.add("show"); s.classList.add("open"); });
}
function closeLayers() {
  ["taskSheet", "settingsSheet"].forEach((id) => {
    const s = $(id);
    if (s.hidden) return;
    s.classList.remove("open");
    s._t = setTimeout(() => { s.hidden = true; }, 460);
  });
  $("backdrop").classList.remove("show");
  setTimeout(() => { if (!$("backdrop").classList.contains("show")) $("backdrop").hidden = true; }, 460);
  document.body.classList.remove("lock");
}

function setPriority(p) {
  priority = p;
  document.querySelectorAll("#prioSeg button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.p === p)));
}

function openTask(id) {
  const t = id ? tasks.find((x) => x.id === id) : null;
  editing = t ? t.id : "new";
  $("sheetTitle").textContent = t ? "Edit task" : "New task";
  $("fTitle").value = t ? t.title : "";
  $("fNotes").value = t ? t.notes || "" : "";
  $("fDue").value = t ? t.due || "" : "";
  $("fRemind").value = t ? toLocalInput(t.remindAt) : "";
  setPriority(t ? t.priority : "medium");
  $("deleteBtn").hidden = !t;
  showLayer("taskSheet");
  setTimeout(() => $("fTitle").focus(), 450);
}

function renderSettings() {
  const on = !!settings.topic;
  $("phoneOff").hidden = on;
  $("phoneOn2").hidden = !on;
  $("topicText").textContent = settings.topic || "";
  let msg;
  if (!("Notification" in window)) msg = "This browser does not support notifications. Use phone notifications instead.";
  else if (Notification.permission === "granted") msg = "Enabled. You get alerts while the app is open or installed.";
  else if (Notification.permission === "denied") msg = "Blocked. Allow notifications for this site in your browser settings.";
  else msg = "Not enabled yet.";
  $("browserStatus").textContent = msg;
  $("browserBtn").hidden = !("Notification" in window) || Notification.permission !== "default";
}
function openSettings() {
  closeLayers();
  setTimeout(() => { renderSettings(); showLayer("settingsSheet"); }, 300);
}

// ======================================================
//  WIRING
// ======================================================
$("fab").onclick = () => openTask();
$("settingsBtn").onclick = () => { renderSettings(); showLayer("settingsSheet"); };
$("backdrop").onclick = closeLayers;
$("cancelBtn").onclick = closeLayers;
$("closeSettings").onclick = closeLayers;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLayers(); });
$("taskForm").addEventListener("submit", (e) => { e.preventDefault(); saveSheet(); });
$("deleteBtn").onclick = () => { const id = editing; closeLayers(); removeTask(id); };

document.querySelectorAll("#prioSeg button").forEach((b) => (b.onclick = () => setPriority(b.dataset.p)));
document.querySelectorAll("#chips button").forEach((b) => {
  b.onclick = () => {
    filter = b.dataset.f;
    document.querySelectorAll("#chips button").forEach((x) => x.classList.toggle("on", x === b));
    seen.clear();            // replay the entrance animation for the new list
    renderList();
  };
});
document.querySelectorAll("[data-quick]").forEach((b) => {
  b.onclick = () => {
    const q = b.dataset.quick;
    const d = new Date();
    if (q === "none") { $("fRemind").value = ""; return; }
    if (q === "10m") d.setMinutes(d.getMinutes() + 10);
    if (q === "1h") d.setHours(d.getHours() + 1);
    if (q === "eve") { d.setHours(18, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 1); }
    if (q === "tom") { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
    $("fRemind").value = toLocalInput(d.toISOString());
    if (!$("fDue").value) $("fDue").value = ymd(d);
  };
});

// ----- settings: phone notifications -----
$("phoneOn").onclick = () => {
  settings.topic = newTopic();
  tasks.forEach((t) => (t.scheduled = false));
  saveSettings(); saveTasks(); renderSettings(); render(); syncReminders();
};
$("phoneOffBtn").onclick = () => {
  tasks.forEach(cancelRemote);
  settings.topic = "";
  saveSettings(); saveTasks(); renderSettings(); render();
};
$("newTopic").onclick = () => {
  if (!confirm("Create a new topic? You will need to subscribe to it again in the ntfy app.")) return;
  tasks.forEach(cancelRemote);
  settings.topic = newTopic();
  saveSettings(); saveTasks(); renderSettings(); render(); syncReminders();
};
$("copyTopic").onclick = async () => {
  try { await navigator.clipboard.writeText(settings.topic); toast("Topic copied"); }
  catch (e) { toast("Select the topic text and copy it"); }
};
$("testBtn").onclick = async () => {
  try {
    const res = await fetch(NTFY + "/" + settings.topic, {
      method: "POST",
      headers: { Title: "Focus test", Tags: "white_check_mark" },
      body: "It works! You will get your task reminders here."
    });
    toast(res.ok ? "Test sent. Check your phone." : "Could not send the test (" + res.status + ")");
  } catch (e) { toast("No internet connection"); }
};

// ----- settings: browser notifications -----
$("browserBtn").onclick = async () => {
  try { await Notification.requestPermission(); } catch (e) {}
  renderSettings();
};

// ----- settings: data -----
$("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "focus-backup-" + todayStr() + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("importBtn").onclick = () => $("importFile").click();
$("importFile").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error("bad file");
    if (!confirm("Replace your current tasks with " + data.length + " imported tasks?")) return;
    tasks.forEach(cancelRemote);
    tasks = data.filter((t) => t && typeof t.title === "string").map((t) => ({
      id: String(t.id || uid()).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || uid(),
      title: t.title.slice(0, 120), notes: String(t.notes || "").slice(0, 300),
      priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
      due: t.due || "", remindAt: t.remindAt || "", done: !!t.done,
      created: t.created || Date.now(), scheduled: false, fired: !!t.fired
    }));
    seen.clear();
    saveTasks(); render(); syncReminders();
    toast("Imported " + tasks.length + " tasks");
  } catch (err) { toast("That file could not be imported"); }
};
$("wipeBtn").onclick = () => {
  if (!confirm("Delete ALL tasks on this device? This cannot be undone.")) return;
  tasks.forEach(cancelRemote);
  tasks = [];
  saveTasks(); render();
  toast("All tasks deleted");
};

// ----- start -----
applyTheme();
render();
checkDue();
syncReminders();
setInterval(() => { checkDue(); syncReminders(); }, 30000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) { renderHeader(); checkDue(); syncReminders(); }
});

if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
