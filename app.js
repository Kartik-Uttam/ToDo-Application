// ===== 1. CONNECT TO SUPABASE =====
if (SUPABASE_URL.startsWith("YOUR_")) {
  document.body.innerHTML =
    '<p style="padding:24px;font-family:sans-serif">Open <b>config.js</b> and paste your Supabase URL and anon key.</p>';
  throw new Error("Supabase is not configured yet");
}
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todos = [];
let filter = "all";
let searchText = "";
let editingId = null;
const $ = (id) => document.getElementById(id);

// ===== 2. SMALL HELPERS =====
function showMessage(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}
function todayString() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function prettyDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ===== 3. DATA LAYER (talks to Supabase) =====
async function loadTodos() {
  const { data, error } = await db.from("todos").select("*").order("created_at", { ascending: false });
  if (error) { showMessage(error.message); return; }
  todos = data;
}
async function addTodo(title, priority, dueDate) {
  const { data: { user } } = await db.auth.getUser();
  const { error } = await db.from("todos").insert({
    user_id: user.id, title, priority, due_date: dueDate || null
  });
  if (error) showMessage(error.message);
}
async function updateTodo(id, changes) {
  const { error } = await db.from("todos").update(changes).eq("id", id);
  if (error) showMessage(error.message);
}
async function deleteTodo(id) {
  const { error } = await db.from("todos").delete().eq("id", id);
  if (error) showMessage(error.message);
}
async function clearCompleted() {
  const { error } = await db.from("todos").delete().eq("done", true);
  if (error) showMessage(error.message);
}

// ===== 4. DRAW THE SCREEN =====
function visibleTodos() {
  const order = { high: 0, medium: 1, low: 2 };
  const q = searchText.toLowerCase();
  return todos
    .filter((t) => {
      if (filter === "active" && t.done) return false;
      if (filter === "done" && !t.done) return false;
      return !q || t.title.toLowerCase().includes(q);
    })
    .sort((a, b) => (a.done - b.done) || (order[a.priority] - order[b.priority]));
}

function render() {
  const list = $("list");
  list.innerHTML = "";
  const shown = visibleTodos();

  if (!shown.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = todos.length ? "No tasks match this view." : "No tasks yet. Add your first task above.";
    list.appendChild(li);
  }

  shown.forEach((t) => {
    const li = document.createElement("li");
    li.className = t.priority + (t.done ? " done" : "");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = t.done;
    cb.setAttribute("aria-label", "Mark task complete");
    cb.onchange = async () => { await updateTodo(t.id, { done: cb.checked }); await refresh(); };

    const body = document.createElement("div");
    body.className = "body";

    if (editingId === t.id) {
      const input = document.createElement("input");
      input.className = "edit-input";
      input.value = t.title;
      input.maxLength = 200;
      const save = async () => {
        const v = input.value.trim();
        editingId = null;
        if (v && v !== t.title) await updateTodo(t.id, { title: v });
        await refresh();
      };
      input.onkeydown = (e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") { editingId = null; render(); }
      };
      input.onblur = save;
      body.appendChild(input);
      setTimeout(() => input.focus(), 0);
    } else {
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = t.title;
      body.appendChild(title);

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = t.priority[0].toUpperCase() + t.priority.slice(1) + " priority";
      if (t.due_date) {
        meta.append(" \u2022 Due ");
        const due = document.createElement("span");
        const late = !t.done && t.due_date < todayString();
        if (late) due.className = "late";
        due.textContent = prettyDate(t.due_date) + (late ? " (overdue)" : "");
        meta.appendChild(due);
      }
      body.appendChild(meta);
    }

    const acts = document.createElement("div");
    acts.className = "acts";
    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.onclick = () => { editingId = t.id; render(); };
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.className = "del";
    del.onclick = async () => { await deleteTodo(t.id); await refresh(); };
    acts.append(edit, del);

    li.append(cb, body, acts);
    list.appendChild(li);
  });

  const left = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - left;
  $("count").textContent = left + (left === 1 ? " task left" : " tasks left");
  $("summary").textContent = todos.length ? doneCount + " of " + todos.length + " done" : "A clean slate";
  $("clearBtn").hidden = doneCount === 0;
}

async function refresh() {
  await loadTodos();
  render();
}

// ===== 5. BUTTONS AND INPUTS =====
$("addBtn").onclick = async () => {
  const title = $("title").value.trim();
  if (!title) { $("title").focus(); return; }
  await addTodo(title, $("priority").value, $("dueDate").value);
  $("title").value = "";
  $("dueDate").value = "";
  $("priority").value = "medium";
  await refresh();
  $("title").focus();
};
$("title").onkeydown = (e) => { if (e.key === "Enter") $("addBtn").click(); };
$("search").oninput = (e) => { searchText = e.target.value; render(); };
$("clearBtn").onclick = async () => { await clearCompleted(); await refresh(); };

document.querySelectorAll(".filters button").forEach((b) => {
  b.onclick = () => {
    filter = b.dataset.filter;
    document.querySelectorAll(".filters button").forEach((x) => x.classList.toggle("active", x === b));
    render();
  };
});

// ===== 6. LOGIN / SIGN UP / LOG OUT =====
async function showScreen() {
  const { data: { session } } = await db.auth.getSession();
  $("auth").hidden = !!session;
  $("app").hidden = !session;
  if (session) await refresh();
}

$("signupBtn").onclick = async () => {
  $("authMsg").textContent = "";
  const { error } = await db.auth.signUp({ email: $("email").value.trim(), password: $("password").value });
  $("authMsg").textContent = error
    ? error.message
    : "Account created. If email confirmation is on, check your inbox, then log in.";
};
$("loginBtn").onclick = async () => {
  $("authMsg").textContent = "";
  const { error } = await db.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
  if (error) $("authMsg").textContent = error.message;
  else showScreen();
};
$("password").onkeydown = (e) => { if (e.key === "Enter") $("loginBtn").click(); };
$("logoutBtn").onclick = async () => {
  await db.auth.signOut();
  todos = [];
  showScreen();
};

showScreen();

// ===== 7. MAKE IT INSTALLABLE (PWA) =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
