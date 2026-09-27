"use strict";
const state = JSON.parse(document.getElementById("state").textContent);
const isDemo = state.demo === true;
const data = state.snapshot,
  history = state.history || [];
const $ = (id) => document.getElementById(id);
const el = (tag, content, cls) => {
  const item = document.createElement(tag);
  if (content !== undefined) item.textContent = content;
  if (cls) item.className = cls;
  return item;
};
const labels = {
  todo: "Not started",
  doing: "In progress",
  done: "Done",
  blocked: "Blocked",
  skipped: "Skipped",
  pending: "Pending",
  answered: "Answered",
  defaulted: "Default used",
  open: "Open",
  resolved: "Resolved",
};
const key = "lantern-ui:" + state.run;
function browserStorage(name) {
  try {
    return window[name];
  } catch {
    return null;
  }
}
const sessionStore = browserStorage("sessionStorage"),
  localStore = browserStorage("localStorage");
function readStore(storage, name, fallback) {
  try {
    return JSON.parse(storage.getItem(name)) || fallback;
  } catch {
    return fallback;
  }
}
function writeStore(storage, name, value) {
  try {
    storage.setItem(name, JSON.stringify(value));
  } catch {}
}
let ui = readStore(sessionStore, key, {});
const views = ["overview", "plan", "decisions", "activity", "developer"];
if (!views.includes(ui.view)) ui.view = "overview";
let theme = readStore(localStore, "lantern-theme", state.style.theme),
  density = readStore(localStore, "lantern-density", state.style.density);
if (!["light", "dark"].includes(theme)) theme = state.style.theme;
if (!["dense", "airy"].includes(density)) density = state.style.density;
function save() {
  writeStore(sessionStore, key, ui);
}
function appearance() {
  document.body.classList.toggle("dark", theme === "dark");
  document.body.classList.toggle("airy", density === "airy");
  $("theme").textContent = theme === "dark" ? "Light mode" : "Dark mode";
  $("density").textContent = density === "dense" ? "Roomier" : "Compact";
}
$("theme").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  writeStore(localStore, "lantern-theme", theme);
  appearance();
});
$("density").addEventListener("click", () => {
  density = density === "dense" ? "airy" : "dense";
  writeStore(localStore, "lantern-density", density);
  appearance();
});
appearance();
document.documentElement.style.setProperty("--accent", state.style.accent);
$("demo-note").hidden = !isDemo;
$("title").textContent = data.title;
$("summary").textContent = data.summary;
$("eyebrow").textContent = state.presentation.eyebrow;
$("run-short").textContent = "Run " + state.run.slice(-8);
$("revision").textContent = "Revision " + state.revision;
$("phase").textContent = {
  active: "In progress",
  blocked: "Blocked",
  paused: "Paused",
  complete: "Complete",
}[data.phase];
$("phase").classList.add(data.phase);
const started = new Date(state.started_at),
  updated = new Date(state.updated_at);
$("started").textContent =
  "Started " +
  started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
$("updated").textContent = "Published " + updated.toLocaleString();
if (state.home_href) {
  $("all-runs").href = state.home_href;
} else {
  $("all-runs").hidden = true;
}
const done = data.tasks.filter((t) => t.status === "done").length,
  skipped = data.tasks.filter((t) => t.status === "skipped").length;
const pending = data.questions.filter((q) => q.status === "pending"),
  required = pending.filter((q) => q.requires_answer),
  blockers = data.blockers.filter((b) => b.status === "open");
$("completion").textContent = done + " / " + data.tasks.length;
$("progress-note").textContent =
  "steps complete" + (skipped ? " · " + skipped + " skipped" : "");
$("progress").max = Math.max(1, data.tasks.length);
$("progress").value = done;
$("doing-count").textContent = data.tasks.filter(
  (t) => t.status === "doing",
).length;
$("question-count").textContent = pending.length;
$("artifact-count").textContent = data.deliverables.length;
$("nav-tasks").textContent = data.tasks.length;
$("nav-decisions").textContent = pending.length;
$("nav-activity").textContent = history.length;
$("task-total").textContent = data.tasks.length + " steps";
$("decision-total").textContent = pending.length + " pending";
$("blocker-total").textContent = blockers.length + " open";
$("deliverable-total").textContent = data.deliverables.length + " items";
if (required.length || blockers.length) {
  const text = el("div");
  text.append(
    el(
      "strong",
      required.length
        ? required.length +
            " decision" +
            (required.length === 1 ? " needs" : "s need") +
            " your answer"
        : blockers.length +
            " blocker" +
            (blockers.length === 1 ? " needs" : "s need") +
            " attention",
    ),
  );
  text.append(
    el(
      "span",
      required.length
        ? "Dependent work waits. Independent work can continue."
        : "The rest of the plan can still move forward.",
      "attention-meta",
    ),
  );
  const button = el("button", "Review attention items →");
  button.addEventListener("click", () => setView("decisions"));
  $("attention").append(text, button);
} else {
  $("attention").hidden = true;
}
function badge(status) {
  return el("span", labels[status] || status, "badge " + status);
}
function empty(container, title, description) {
  const item = el("div", undefined, "empty");
  item.append(el("strong", title), el("span", description));
  container.append(item);
}
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $("toast").hidden = true;
  }, 2600);
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    $("copy-text").value = text;
    $("copy-dialog").showModal();
    $("copy-text").focus();
    $("copy-text").select();
  }
}
$("close-copy").addEventListener("click", () => $("copy-dialog").close());
function copyButton(label, text) {
  const button = el("button", label, "text-button");
  button.addEventListener("click", () => copy(text));
  return button;
}
const taskRows = [];
for (const [index, task] of data.tasks.entries()) {
  const row = el("article", undefined, "row task-row " + task.status);
  row.dataset.status = task.status;
  const content = el("div");
  content.append(el("h3", task.title, "task-title"));
  if (task.detail) content.append(el("p", task.detail));
  row.append(
    el("span", String(index + 1).padStart(2, "0"), "task-number"),
    content,
    badge(task.status),
  );
  $("task-list").append(row);
  taskRows.push({ row, task });
}
if (!data.tasks.length)
  empty(
    $("task-list"),
    "The plan is taking shape.",
    "Steps appear when the agent publishes its first plan.",
  );
$("task-search").value = typeof ui.query === "string" ? ui.query : "";
$("task-filter").value = [
  "all",
  "open",
  "doing",
  "blocked",
  "done",
  "todo",
  "skipped",
].includes(ui.filter)
  ? ui.filter
  : "all";
function filterTasks() {
  const query = $("task-search").value.toLowerCase().trim(),
    filter = $("task-filter").value;
  let visible = 0;
  for (const { row, task } of taskRows) {
    const status =
      filter === "all" ||
      (filter === "open"
        ? !["done", "skipped"].includes(task.status)
        : task.status === filter);
    const match =
      status &&
      (task.title + " " + task.detail + " " + task.id)
        .toLowerCase()
        .includes(query);
    row.hidden = !match;
    if (match) visible++;
  }
  $("task-empty").hidden = visible > 0 || !data.tasks.length;
  $("task-result").textContent =
    visible + " of " + data.tasks.length + " steps · " + done + " complete";
  ui.query = $("task-search").value;
  ui.filter = filter;
  save();
}
$("task-search").addEventListener("input", filterTasks);
$("task-filter").addEventListener("change", filterTasks);
filterTasks();
const questions = [...data.questions].sort(
  (a, b) =>
    (a.status === "pending" ? 0 : 2) +
    (a.requires_answer ? 0 : 1) -
    ((b.status === "pending" ? 0 : 2) + (b.requires_answer ? 0 : 1)),
);
for (const question of questions) {
  const row = el(
    "article",
    undefined,
    "row decision-row" + (question.requires_answer ? " required" : ""),
  );
  row.append(
    el(
      "span",
      question.requires_answer ? "ANSWER REQUIRED" : "OPTIONAL PREFERENCE",
      "decision-kind",
    ),
  );
  const top = el("div", undefined, "decision-top");
  top.append(el("h3", question.question), badge(question.status));
  row.append(top);
  const box = el("div", undefined, "decision-default");
  box.append(
    el(
      "strong",
      question.status === "answered"
        ? "Your answer"
        : question.requires_answer
          ? "While waiting"
          : question.status === "defaulted"
            ? "Default applied"
            : "If you don’t answer",
    ),
    el(
      "span",
      question.status === "answered" ? question.answer : question.default,
    ),
  );
  row.append(box);
  const action = el("div", undefined, "decision-action");
  action.append(
    el(
      "span",
      question.status === "pending"
        ? "Reply in your agent chat"
        : "Recorded in this run",
    ),
    copyButton(
      "Copy question",
      "Question " + question.id + ": " + question.question + "\nMy answer: ",
    ),
  );
  row.append(action);
  $("question-list").append(row);
}
if (!questions.length)
  empty(
    $("question-list"),
    "No decisions waiting.",
    "The agent has what it needs to keep working.",
  );
for (const blocker of [...data.blockers].sort((a, b) =>
  a.status === b.status ? 0 : a.status === "open" ? -1 : 1,
)) {
  const row = el("article", undefined, "row blocker-row " + blocker.status),
    top = el("div", undefined, "row-top");
  top.append(el("h3", blocker.title), badge(blocker.status));
  row.append(top);
  if (blocker.detail) row.append(el("p", blocker.detail));
  $("blocker-list").append(row);
}
if (!data.blockers.length)
  empty(
    $("blocker-list"),
    "Nothing is blocked.",
    "No blockers have been reported for this run.",
  );
function safeWebLink(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
for (const artifact of data.deliverables) {
  const row = el("article", undefined, "row deliverable-row"),
    top = el("div", undefined, "artifact-top");
  const extension = artifact.path.split(".").pop().split(/[?#]/)[0];
  top.append(
    el("h3", artifact.title),
    el("span", extension.length < 8 ? extension : "FILE", "artifact-label"),
  );
  row.append(top);
  if (artifact.detail) row.append(el("p", artifact.detail));
  const line = el("div", undefined, "path-line");
  line.append(
    el("code", artifact.path, "path"),
    copyButton("Copy path", artifact.path),
  );
  const href = safeWebLink(artifact.path);
  if (href) {
    const link = el("a", "Open ↗");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    line.append(link);
  }
  row.append(line);
  $("deliverable-list").append(row);
}
if (!data.deliverables.length)
  empty(
    $("deliverable-list"),
    "The work will land here.",
    "Files and links appear as the agent records deliverables.",
  );
function drawActivity(all) {
  $("activity-list").replaceChildren();
  const events = [...history].reverse();
  $("activity-total").textContent = history.length + " events";
  if (!events.length)
    empty(
      $("activity-list"),
      "No changes recorded yet.",
      "Activity is recorded on each publish. Older runs begin recording on their next update.",
    );
  for (const event of all ? events : events.slice(0, 4)) {
    const row = el("article", undefined, "activity-row"),
      time = new Date(event.at),
      content = el("div");
    const label =
      {
        added: "Added",
        removed: "Removed",
        status: "Status changed",
        updated: "Updated",
        confirmed: "Checked",
      }[event.kind] || "Updated";
    row.append(
      el(
        "time",
        time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        "activity-time",
      ),
    );
    content.append(
      el("strong", event.label),
      el(
        "p",
        event.kind === "status"
          ? labels[event.before] + " → " + labels[event.after]
          : label + (event.after ? " · " + event.after : ""),
      ),
      el("div", "r" + event.revision + " · " + event.panel, "event-meta"),
    );
    row.append(content);
    $("activity-list").append(row);
  }
  $("all-activity").hidden = all || history.length <= 4;
}
$("all-activity").addEventListener("click", () => setView("activity"));
for (const [label, value] of [
  ["Schema", "v" + state.version],
  ["Revision", String(state.revision)],
  ["Journal", history.length + " / 100 events"],
  ["Storage", "Local file"],
]) {
  const item = el("div", undefined, "dev-stat");
  item.append(el("span", label), el("strong", value));
  $("dev-stats").append(item);
}
for (const [name, command] of Object.entries(state.commands || {})) {
  const row = el("div", undefined, "command"),
    head = el("div", undefined, "command-head");
  head.append(
    el(
      "strong",
      {
        status: "Inspect state",
        patch: "Apply a patch",
        render: "Rebuild this view",
      }[name],
    ),
    copyButton("Copy", command),
  );
  row.append(head, el("code", command));
  $("commands").append(row);
}
const patchExample = JSON.stringify(
  data.tasks.length
    ? {
        tasks: [
          {
            ...(data.tasks.find((t) => t.status === "doing") || data.tasks[0]),
            status: "done",
          },
        ],
      }
    : { summary: "Describe the latest verified progress." },
  null,
  2,
);
$("patch-example").textContent = patchExample;
$("copy-patch").addEventListener("click", () => copy(patchExample));
const snapshotJSON = JSON.stringify(data, null, 2);
$("snapshot-json").textContent = snapshotJSON;
$("copy-snapshot").addEventListener("click", () => copy(snapshotJSON));
const viewMeta = {
  plan: [
    "The plan",
    "Find the next step, check completed work, or isolate what is blocked.",
  ],
  decisions: [
    "Decisions & blockers",
    "What needs an answer, what can wait, and what happens next.",
  ],
  activity: [
    "Activity journal",
    "The latest 100 changes recorded at publication time.",
  ],
  developer: [
    "Developer workspace",
    "Inspect the source, make precise updates, and hand work between sessions.",
  ],
};
function setView(view, initial = false) {
  ui.view = views.includes(view) ? view : "overview";
  save();
  for (const button of document.querySelectorAll("[data-view]")) {
    if (button.dataset.view === ui.view)
      button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  const overview = ui.view === "overview";
  $("overview-strip").hidden = !overview;
  $("view-heading").hidden = overview;
  if (!overview) {
    $("view-title").textContent = viewMeta[ui.view][0];
    $("view-description").textContent = viewMeta[ui.view][1];
  }
  $("workspace-grid").hidden = ui.view === "developer";
  $("workspace-grid").classList.toggle("single", !overview);
  $("tasks").hidden = !overview && ui.view !== "plan";
  $("right-column").hidden = !overview && ui.view !== "decisions";
  $("deliverables").hidden = !overview;
  $("activity").hidden = !overview && ui.view !== "activity";
  $("developer").hidden = ui.view !== "developer";
  drawActivity(ui.view === "activity");
  if (!initial) window.scrollTo({ top: 0, behavior: "instant" });
}
for (const button of document.querySelectorAll("[data-view]"))
  button.addEventListener("click", () => setView(button.dataset.view));
$("workspace-grid").classList.toggle(
  "brief",
  state.presentation.layout === "brief",
);
const order = state.presentation.order;
$("tasks").style.order = order.indexOf("tasks");
$("right-column").style.order = Math.min(
  order.indexOf("questions"),
  order.indexOf("blockers"),
);
$("questions").style.order = order.indexOf("questions");
$("blockers").style.order = order.indexOf("blockers");
$("deliverables").style.order = order.indexOf("deliverables");
$("activity").style.order = 4;
setView(ui.view, true);
document.addEventListener("keydown", (event) => {
  const input = ["INPUT", "TEXTAREA", "SELECT"].includes(
    document.activeElement.tagName,
  );
  if (event.key === "/" && !input && !document.querySelector("dialog[open]")) {
    event.preventDefault();
    setView("plan");
    $("task-search").focus();
  }
  if (event.key === "Escape" && document.activeElement === $("task-search")) {
    $("task-search").value = "";
    filterTasks();
    $("task-search").blur();
  }
});
function markdown() {
  const lines = [
    "# " + data.title,
    "",
    data.summary,
    "",
    "Status: " + data.phase + " · Revision " + state.revision,
    "Published: " + state.updated_at,
    "",
    "## Plan",
    "",
  ];
  for (const task of data.tasks)
    lines.push(
      "- [" +
        (task.status === "done" ? "x" : " ") +
        "] " +
        task.title +
        " (" +
        task.status +
        ")" +
        (task.detail ? " — " + task.detail : ""),
    );
  lines.push("", "## Decisions", "");
  for (const q of data.questions)
    lines.push(
      "- " + q.question + " [" + q.status + "]",
      "  " +
        (q.status === "answered"
          ? "Answer: " + q.answer
          : (q.requires_answer ? "While waiting: " : "Default: ") + q.default),
    );
  lines.push("", "## Blockers", "");
  for (const b of data.blockers)
    lines.push("- " + b.title + " [" + b.status + "] — " + b.detail);
  lines.push("", "## Deliverables", "");
  for (const a of data.deliverables)
    lines.push(
      "- " + a.title + ": " + a.path + (a.detail ? " — " + a.detail : ""),
    );
  if (isDemo)
    lines.splice(2, 0, "_Demo: fictional task data. No agent is running._", "");
  return lines.join("\n") + "\n";
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    link = el("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Export prepared");
}
$("export").addEventListener("click", () => $("export-dialog").showModal());
$("close-export").addEventListener("click", () => $("export-dialog").close());
$("export-markdown").addEventListener("click", () =>
  download("task-lantern-" + state.run + ".md", markdown(), "text/markdown"),
);
$("export-json").addEventListener("click", () => {
  const { presentation, commands, home_href, ...source } = state;
  download(
    "task-lantern-" + state.run + ".json",
    JSON.stringify(source, null, 2),
    "application/json",
  );
});
$("copy-summary").addEventListener("click", () =>
  copy(
    (isDemo ? "Demo: fictional task data.\n" : "") +
      data.title +
      "\n" +
      data.summary +
      "\n" +
      done +
      "/" +
      data.tasks.length +
      " steps complete · " +
      pending.length +
      " pending decisions · " +
      blockers.length +
      " open blockers\nPublished " +
      state.updated_at +
      " (revision " +
      state.revision +
      ")",
  ),
);
const terminal = ["complete", "paused"].includes(data.phase);
function refreshLabel() {
  $("refresh").textContent = isDemo
    ? "Reload demo"
    : terminal
      ? "Refresh now"
      : ui.paused
        ? "Resume"
        : "Pause";
  $("refresh").setAttribute("aria-pressed", String(!!ui.paused));
}
$("refresh").addEventListener("click", () => {
  if (terminal || isDemo) {
    location.reload();
    return;
  }
  ui.paused = !ui.paused;
  save();
  refreshLabel();
  freshness();
});
function freshness() {
  if (isDemo) {
    $("freshness").textContent = "Sample data";
    $("freshness").title =
      "This fictional demo is static. Real runs refresh after the agent publishes updates.";
    $("duration").hidden = true;
    return;
  }
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - updated.getTime()) / 1000),
  );
  const age = seconds < 60 ? seconds + "s" : Math.floor(seconds / 60) + "m";
  const stale = seconds > 120 && !terminal;
  $("freshness").classList.toggle("stale", stale);
  $("freshness").textContent = terminal
    ? "Saved " + age + " ago"
    : ui.paused
      ? "Refresh paused"
      : stale
        ? "No update for " + age
        : "Updated " + age + " ago";
  $("freshness").title =
    "Last published " +
    updated.toLocaleString() +
    ". Refreshing does not prove the agent is still running.";
  const elapsed = Math.max(
    0,
    Math.floor(
      ((terminal ? updated.getTime() : Date.now()) - started.getTime()) / 60000,
    ),
  );
  $("duration").textContent =
    elapsed < 1 ? "Started just now" : elapsed + "m since start";
}
refreshLabel();
freshness();
setInterval(freshness, 1000);
window.addEventListener(
  "scroll",
  () => {
    ui.scroll = window.scrollY;
    save();
  },
  { passive: true },
);
if (ui.scroll) requestAnimationFrame(() => window.scrollTo(0, ui.scroll));
setInterval(() => {
  if (
    !ui.paused &&
    !terminal &&
    !isDemo &&
    !document.querySelector("dialog[open]") &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
  ) {
    save();
    location.reload();
  }
}, 10000);
