"use strict";
const workspace = JSON.parse(document.getElementById("state").textContent);
const threads = workspace.threads || [];
const isDemo = workspace.demo === true;
const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
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
  active: "In progress",
  paused: "Paused",
  complete: "Complete",
};
function storage(name) {
  try {
    return window[name];
  } catch {
    return null;
  }
}
const sessionStore = storage("sessionStorage"),
  localStore = storage("localStorage");
function readStore(store, key, fallback) {
  try {
    return JSON.parse(store.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeStore(store, key, value) {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {}
}
const workspaceKey = "lantern-workspace:" + location.pathname;
const workspaceUI = readStore(sessionStore, workspaceKey, {});
const sections = ["plan", "decisions", "deliverables", "activity", "developer"];
let state,
  data,
  history,
  ui,
  taskRows = [],
  patchExample = "",
  snapshotJSON = "";
let theme = readStore(
  localStore,
  "lantern-theme",
  threads[0]?.style?.theme || "light",
);
let density = readStore(
  localStore,
  "lantern-density",
  threads[0]?.style?.density || "dense",
);
if (!["light", "dark"].includes(theme)) theme = "light";
if (!["dense", "airy"].includes(density)) density = "dense";
const mobile = matchMedia("(max-width:760px)");
let sidebarOpen =
  typeof workspaceUI.sidebar === "boolean"
    ? workspaceUI.sidebar
    : !mobile.matches;
function saveWorkspace() {
  writeStore(sessionStore, workspaceKey, workspaceUI);
}
function save() {
  if (state) writeStore(sessionStore, "lantern-thread:" + state.key, ui);
}
function appearance() {
  document.body.classList.toggle("dark", theme === "dark");
  document.body.classList.toggle("airy", density === "airy");
  $("theme").textContent = theme === "dark" ? "Light mode" : "Dark mode";
  $("density").textContent =
    density === "dense" ? "Roomier rows" : "Compact rows";
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
function toggleSidebar(open, returnFocus = false) {
  sidebarOpen = open;
  workspaceUI.sidebar = open;
  saveWorkspace();
  $("workspace").classList.toggle("sidebar-closed", !open);
  $("toggle-threads").setAttribute("aria-expanded", String(open));
  $("sidebar-backdrop").hidden = !open || !mobile.matches;
  $("thread-sidebar").inert = !open;
  if (open && mobile.matches) {
    $("thread-sidebar").setAttribute("role", "dialog");
    $("thread-sidebar").setAttribute("aria-modal", "true");
  } else {
    $("thread-sidebar").removeAttribute("role");
    $("thread-sidebar").removeAttribute("aria-modal");
  }
  // On narrow screens the drawer is modal: keep background controls out of the tab order.
  $("main").inert = open && mobile.matches;
  if (returnFocus) $("toggle-threads").focus();
}
$("toggle-threads").addEventListener("click", () => {
  toggleSidebar(!sidebarOpen);
  if (sidebarOpen && mobile.matches) $("thread-search").focus();
});
$("close-threads").addEventListener("click", () => toggleSidebar(false, true));
$("sidebar-backdrop").addEventListener("click", () =>
  toggleSidebar(false, true),
);
mobile.addEventListener("change", () => toggleSidebar(!mobile.matches));
toggleSidebar(sidebarOpen);
$("demo-note").hidden = !isDemo;
$("thread-count").textContent = threads.length;
$("workspace-label").textContent =
  workspace.scope === "thread" ? "Thread dashboard" : "Your workspace";
$("sidebar-caption").textContent =
  workspace.scope === "all"
    ? "Across your projects"
    : workspace.scope === "project"
      ? "In this project"
      : "This portable dashboard";
if (workspace.unreadable?.length) {
  $("workspace-warning").hidden = false;
  $("workspace-warning").textContent =
    workspace.unreadable.length +
    " tracked thread(s) could not be read. Their files may have moved or become unreadable. Run the workspace command after fixing them.";
}
const hostLabel = (value) =>
  ({ codex: "Codex", claude: "Claude Code", agent: "Coding agent" })[value] ||
  "Coding agent";
const counts = (t) => ({
  done: t.snapshot.tasks.filter((x) => x.status === "done").length,
  total: t.snapshot.tasks.length,
  required: t.snapshot.questions.filter(
    (x) => x.status === "pending" && x.requires_answer,
  ).length,
  questions: t.snapshot.questions.filter((x) => x.status === "pending").length,
  blocked: t.snapshot.blockers.filter((x) => x.status === "open").length,
});
function badge(status) {
  return el("span", labels[status] || status, "badge " + status);
}
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
let toastTimer;
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 2400);
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
function copyButton(label, text) {
  const button = el("button", label, "text-button");
  button.addEventListener("click", () => copy(text));
  return button;
}
$("close-copy").addEventListener("click", () => $("copy-dialog").close());
function route(section) {
  const params = new URLSearchParams({ thread: state.key });
  if (section) params.set("detail", section);
  try {
    window.history.replaceState(null, "", "#" + params.toString());
  } catch {}
}
function openDetail(section, taskId) {
  if (!sections.includes(section) || !state) return;
  if (taskId) {
    $("task-search").value = "";
    $("task-filter").value = "all";
    filterTasks();
  }
  const details = $(section + "-details");
  details.open = true;
  ui.open = { ...ui.open, [section]: true };
  save();
  route(section);
  const target = taskId
    ? document.querySelector('[data-task-id="' + CSS.escape(taskId) + '"]')
    : details;
  (target || details).scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
      ? "instant"
      : "smooth",
    block: "start",
  });
  if (taskId && target) {
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  } else {
    details.querySelector("summary").focus({ preventScroll: true });
  }
}
for (const button of document.querySelectorAll("[data-detail]"))
  button.addEventListener("click", () => openDetail(button.dataset.detail));
for (const section of sections) {
  $(section + "-details").addEventListener("toggle", () => {
    if (!ui) return;
    ui.open = { ...ui.open, [section]: $(section + "-details").open };
    save();
    if (
      !ui.open[section] &&
      new URLSearchParams(location.hash.slice(1)).get("detail") === section
    )
      route();
  });
}
$("home").addEventListener("click", (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (state) route();
});
let threadFilter = ["all", "active", "attention"].includes(workspaceUI.filter)
  ? workspaceUI.filter
  : "all";
$("thread-search").value = workspaceUI.query || "";
function drawThreads() {
  const q = $("thread-search").value.toLowerCase().trim();
  $("thread-list").replaceChildren();
  let shown = 0;
  for (const completed of [false, true]) {
    const matches = threads
      .filter((t) => (t.snapshot.phase === "complete") === completed)
      .filter((t) => {
        const c = counts(t);
        return (
          (t.snapshot.title + " " + t.project + " " + hostLabel(t.host))
            .toLowerCase()
            .includes(q) &&
          (threadFilter === "all" ||
            (threadFilter === "active"
              ? ["active", "blocked"].includes(t.snapshot.phase)
              : c.required + c.blocked > 0))
        );
      });
    if (!matches.length) continue;
    $("thread-list").append(
      el(
        "div",
        (completed ? "Completed" : "Tracked") + " · " + matches.length,
        "thread-group-label" + (completed ? " completed" : ""),
      ),
    );
    for (const t of matches) {
      const c = counts(t),
        button = el("button", undefined, "thread-item");
      button.dataset.thread = t.key;
      button.setAttribute("aria-current", String(t.key === state?.key));
      const project = el("span", undefined, "thread-project");
      const dot = el("i", undefined, "status-dot " + t.snapshot.phase);
      dot.setAttribute("aria-hidden", "true");
      project.append(
        dot,
        document.createTextNode(t.project + " · " + hostLabel(t.host)),
      );
      const bottom = el("span", undefined, "thread-bottom");
      bottom.append(
        el("span", c.done + " / " + c.total + " done"),
        el(
          "span",
          c.required
            ? c.required + " needs you"
            : c.blocked
              ? c.blocked + " blocked"
              : labels[t.snapshot.phase],
          c.required || c.blocked ? "thread-alert" : "",
        ),
      );
      const bar = el("span", undefined, "thread-bar"),
        fill = el("span");
      fill.style.width = (c.total ? (c.done / c.total) * 100 : 0) + "%";
      bar.append(fill);
      button.append(
        project,
        el("span", t.snapshot.title, "thread-title"),
        bottom,
        bar,
      );
      button.addEventListener("click", () => {
        selectThread(t.key);
        if (mobile.matches) toggleSidebar(false);
        $("title").tabIndex = -1;
        $("title").focus({ preventScroll: true });
      });
      $("thread-list").append(button);
      shown++;
    }
  }
  $("no-threads").hidden = shown > 0;
  for (const b of document.querySelectorAll("[data-thread-filter]"))
    b.setAttribute(
      "aria-pressed",
      String(b.dataset.threadFilter === threadFilter),
    );
  workspaceUI.filter = threadFilter;
  workspaceUI.query = $("thread-search").value;
  saveWorkspace();
}
$("thread-search").addEventListener("input", drawThreads);
for (const b of document.querySelectorAll("[data-thread-filter]"))
  b.addEventListener("click", () => {
    threadFilter = b.dataset.threadFilter;
    drawThreads();
  });
function empty(id, text) {
  $(id).append(el("div", text, "empty"));
}
function selectThread(key, initial = false) {
  const chosen = threads.find((t) => t.key === key);
  if (!chosen) return;
  state = chosen;
  data = state.snapshot;
  history = state.history || [];
  ui = readStore(sessionStore, "lantern-thread:" + state.key, {});
  workspaceUI.selected = key;
  saveWorkspace();
  $("thread-content").hidden = false;
  $("workspace-empty").hidden = true;
  document.title = data.title + " · Task Lantern";
  document.documentElement.style.setProperty("--accent", state.style.accent);
  $("thread-style").textContent = state.custom_css || "";
  $("title").title = state.presentation?.eyebrow || "";
  document
    .querySelector(".at-a-glance")
    .classList.toggle("brief", state.presentation?.layout === "brief");
  const order = [
    ...new Set(
      (
        state.presentation?.order || [
          "tasks",
          "questions",
          "blockers",
          "deliverables",
        ]
      ).map(
        (p) =>
          ({
            tasks: "plan",
            questions: "decisions",
            blockers: "decisions",
            deliverables: "deliverables",
          })[p],
      ),
    ),
  ];
  for (const section of [...order, "activity", "developer"])
    $("detail-stack").append($(section + "-details"));
  $("project-label").textContent = state.project;
  $("host-label").textContent = hostLabel(state.host);
  $("title").textContent = data.title;
  $("summary").textContent = data.summary;
  $("phase").textContent = labels[data.phase];
  $("phase").className = "phase " + data.phase;
  $("revision").textContent = "Revision " + state.revision;
  $("updated").textContent = isDemo
    ? "Sample data · Nothing is running"
    : "Published " + new Date(state.updated_at).toLocaleString();
  const c = counts(state),
    doing = data.tasks.filter((t) => t.status === "doing"),
    unfinished = data.tasks.filter(
      (t) => !["done", "skipped"].includes(t.status),
    );
  const current =
    doing[0] || unfinished.find((t) => t.status === "blocked") || unfinished[0];
  $("current-label").textContent =
    data.phase === "complete"
      ? "FINISHED"
      : data.phase === "paused"
        ? "PAUSED"
        : doing.length
          ? "WORKING ON"
          : current?.status === "blocked"
            ? "WAITING ON"
            : "NEXT STEP";
  $("current-task").textContent =
    current?.title ||
    (data.phase === "complete"
      ? "Ready for handoff."
      : "The plan is taking shape.");
  $("current-detail").textContent =
    current?.detail ||
    (data.phase === "complete"
      ? "The agent marked this thread complete. Files and decisions are below."
      : "The next publication will bring the first steps into view.");
  $("step-position").textContent = current
    ? "Step " + (data.tasks.indexOf(current) + 1) + " of " + c.total
    : "";
  $("completion").textContent =
    c.done +
    " of " +
    c.total +
    " steps complete" +
    (data.tasks.some((t) => t.status === "skipped")
      ? " · " +
        data.tasks.filter((t) => t.status === "skipped").length +
        " skipped"
      : "");
  $("progress").max = Math.max(c.total, 1);
  $("progress").value = c.done;
  $("segments").replaceChildren();
  for (const task of data.tasks) {
    const b = el("button", undefined, "segment " + task.status);
    b.title = task.title + " · " + labels[task.status];
    b.setAttribute("aria-label", b.title);
    b.addEventListener("click", () => openDetail("plan", task.id));
    $("segments").append(b);
  }
  $("next-task").textContent =
    data.phase === "complete"
      ? "Review the deliverables"
      : data.tasks.find((t) => t.status === "todo" && t !== current)?.title ||
        (doing.length > 1
          ? doing.length - 1 + " other step(s) in progress"
          : "No later step recorded");
  const pending = data.questions
    .filter((q) => q.status === "pending")
    .sort((a, b) => Number(b.requires_answer) - Number(a.requires_answer));
  $("attention-preview").replaceChildren();
  $("attention-count").textContent = pending.length
    ? pending.length + " pending"
    : "";
  $("attention-label").textContent = c.required
    ? "NEEDS YOUR ANSWER"
    : pending.length
      ? "OPTIONAL PREFERENCE"
      : "NO DECISIONS WAITING";
  if (pending.length) {
    const q = pending[0];
    $("attention-preview").append(el("div", q.question, "attention-question"));
    const d = el("div", undefined, "attention-default");
    d.append(
      el(
        "strong",
        q.requires_answer ? "While waiting: " : "If you don’t answer: ",
      ),
      document.createTextNode(q.default),
    );
    $("attention-preview").append(d);
    if (pending.length > 1)
      $("attention-preview").append(
        el(
          "p",
          "+ " +
            (pending.length - 1) +
            " more decision" +
            (pending.length > 2 ? "s" : "") +
            " · open to see defaults",
          "attention-extra",
        ),
      );
  } else {
    $("attention-preview").append(
      el(
        "div",
        data.phase === "complete"
          ? "All wrapped up."
          : "You’re not holding it up.",
        "clear-state",
      ),
      el(
        "p",
        data.phase === "complete"
          ? "No unresolved questions or blockers were published."
          : "No decisions are waiting for your answer. Check the plan for the latest reported work.",
        "attention-default",
      ),
    );
  }
  $("review-decisions").hidden = !pending.length;
  const blockers = data.blockers.filter((b) => b.status === "open");
  $("blocker-preview").hidden = !blockers.length;
  $("blocker-preview").replaceChildren();
  if (blockers.length)
    $("blocker-preview").append(
      el("strong", blockers.length + " blocked"),
      el("span", blockers[0].title),
      el("span", "Review ↗"),
    );
  $("deliverables-preview").replaceChildren();
  $("deliverables-preview").append(
    el(
      "span",
      data.deliverables.length ? "Ready to inspect" : "No files published yet",
    ),
  );
  for (const a of data.deliverables.slice(0, 2)) {
    const b = el("button", a.title, "file-chip");
    b.addEventListener("click", () => openDetail("deliverables"));
    $("deliverables-preview").append(b);
  }
  if (data.deliverables.length > 2) {
    const b = el(
      "button",
      "+" + (data.deliverables.length - 2) + " more",
      "text-button",
    );
    b.addEventListener("click", () => openDetail("deliverables"));
    $("deliverables-preview").append(b);
  }
  $("plan-meta").textContent = c.done + " / " + c.total + " complete";
  $("decisions-meta").textContent =
    c.questions + " pending · " + c.blocked + " blocked";
  $("deliverables-meta").textContent = data.deliverables.length + " published";
  $("activity-meta").textContent = history.length + " events";
  drawPlan();
  drawDecisions();
  drawDeliverables();
  drawActivity();
  drawDeveloper();
  for (const section of sections)
    $(section + "-details").open = ui.open?.[section] === true;
  for (const detail of document.querySelectorAll(".nested-detail"))
    detail.open = false;
  drawThreads();
  freshness();
  refreshLabel();
  if (!initial) {
    window.scrollTo({ top: 0, behavior: "instant" });
    ui.scroll = 0;
    route();
    save();
  } else if (ui.scroll)
    requestAnimationFrame(() => window.scrollTo(0, ui.scroll));
}
function drawPlan() {
  $("task-list").replaceChildren();
  taskRows = [];
  for (const [i, t] of data.tasks.entries()) {
    const row = el("article", undefined, "row task-row " + t.status),
      content = el("div");
    row.dataset.taskId = t.id;
    row.dataset.status = t.status;
    content.append(el("h3", t.title, "task-title"));
    if (t.detail) content.append(el("p", t.detail));
    row.append(
      el(
        "span",
        t.status === "done" ? "✓" : String(i + 1).padStart(2, "0"),
        "task-number",
      ),
      content,
      badge(t.status),
    );
    $("task-list").append(row);
    taskRows.push({ row, task: t });
  }
  if (!data.tasks.length)
    empty("task-list", "Steps appear when the agent publishes a plan.");
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
  filterTasks();
}
function filterTasks() {
  if (!state) return;
  const q = $("task-search").value.toLowerCase().trim(),
    f = $("task-filter").value;
  let visible = 0;
  for (const { row, task: t } of taskRows) {
    row.hidden = !(
      (f === "all" ||
        (f === "open"
          ? !["done", "skipped"].includes(t.status)
          : t.status === f)) &&
      (t.title + " " + t.detail + " " + t.id).toLowerCase().includes(q)
    );
    if (!row.hidden) visible++;
  }
  $("task-empty").hidden = visible > 0 || !data.tasks.length;
  $("task-result").textContent =
    visible + " of " + data.tasks.length + " steps";
  ui.query = $("task-search").value;
  ui.filter = f;
  save();
}
$("task-search").addEventListener("input", filterTasks);
$("task-filter").addEventListener("change", filterTasks);
function drawDecisions() {
  $("question-list").replaceChildren();
  $("blocker-list").replaceChildren();
  const questions = [...data.questions].sort(
    (a, b) =>
      (a.status === "pending" ? 0 : 2) +
      (a.requires_answer ? 0 : 1) -
      ((b.status === "pending" ? 0 : 2) + (b.requires_answer ? 0 : 1)),
  );
  for (const q of questions) {
    const row = el(
      "article",
      undefined,
      "row decision-row" + (q.requires_answer ? " required" : ""),
    );
    row.append(
      el(
        "span",
        q.requires_answer ? "ANSWER REQUIRED" : "OPTIONAL PREFERENCE",
        "decision-kind",
      ),
    );
    const top = el("div", undefined, "decision-top");
    top.append(el("h3", q.question), badge(q.status));
    const box = el("div", undefined, "decision-default");
    box.append(
      el(
        "strong",
        q.status === "answered"
          ? "Your answer"
          : q.requires_answer
            ? "While waiting"
            : q.status === "defaulted"
              ? "Default applied"
              : "If you don’t answer",
      ),
      el("span", q.status === "answered" ? q.answer : q.default),
    );
    const action = el("div", undefined, "decision-action");
    action.append(
      el(
        "span",
        q.status === "pending"
          ? "Answer in your agent chat"
          : "Recorded in this thread",
      ),
      copyButton(
        "Copy question",
        "Question " + q.id + ": " + q.question + "\nMy answer: ",
      ),
    );
    row.append(top, box, action);
    $("question-list").append(row);
  }
  if (!questions.length)
    empty("question-list", "No decisions have been published.");
  if (data.blockers.length)
    $("blocker-list").append(el("h2", "Blockers", "section-title"));
  for (const b of [...data.blockers].sort(
    (a, b) => Number(b.status === "open") - Number(a.status === "open"),
  )) {
    const row = el("article", undefined, "row blocker-row " + b.status),
      top = el("div", undefined, "row-top");
    top.append(el("h3", b.title), badge(b.status));
    row.append(top, el("p", b.detail));
    $("blocker-list").append(row);
  }
}
function drawDeliverables() {
  $("deliverable-list").replaceChildren();
  for (const a of data.deliverables) {
    const row = el("article", undefined, "row deliverable-row"),
      top = el("div", undefined, "artifact-top"),
      ext = a.path.split(".").pop().split(/[?#]/)[0];
    top.append(
      el("h3", a.title),
      el("span", ext.length < 8 ? ext : "FILE", "artifact-label"),
    );
    row.append(top);
    if (a.detail) row.append(el("p", a.detail));
    const line = el("div", undefined, "path-line");
    line.append(el("code", a.path), copyButton("Copy path", a.path));
    const href = safeWebLink(a.path);
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
      "deliverable-list",
      "Files and links appear when the agent publishes them.",
    );
}
function drawActivity() {
  $("activity-list").replaceChildren();
  for (const event of [...history].reverse()) {
    const row = el("article", undefined, "activity-row"),
      content = el("div"),
      time = el(
        "time",
        new Date(event.at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        "activity-time",
      );
    time.dateTime = event.at;
    content.append(
      el("strong", event.label),
      el(
        "p",
        event.kind === "status"
          ? (labels[event.before] || event.before) +
              " → " +
              (labels[event.after] || event.after)
          : ({
              added: "Added",
              removed: "Removed",
              updated: "Updated",
              confirmed: "Checked",
            }[event.kind] || "Updated") +
              (event.after ? " · " + event.after : ""),
      ),
      el("div", "r" + event.revision + " · " + event.panel, "event-meta"),
    );
    row.append(time, content);
    $("activity-list").append(row);
  }
  if (!history.length)
    empty(
      "activity-list",
      "No changes recorded yet. Publications add real, timestamped events.",
    );
}
function drawDeveloper() {
  $("dev-stats").replaceChildren();
  $("commands").replaceChildren();
  for (const [label, value] of [
    ["Schema", "v" + state.version],
    ["Revision", state.revision],
    ["Events", history.length + " / 100"],
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
          render: "Rebuild this dashboard",
        }[name] || name,
      ),
      copyButton("Copy", command),
    );
    row.append(head, el("code", command));
    $("commands").append(row);
  }
  patchExample = JSON.stringify(
    data.tasks.length
      ? {
          tasks: [
            {
              ...(data.tasks.find((t) => t.status === "doing") ||
                data.tasks[0]),
              status: "done",
            },
          ],
        }
      : { summary: "Describe the latest verified progress." },
    null,
    2,
  );
  snapshotJSON = JSON.stringify(data, null, 2);
  $("patch-example").textContent = patchExample;
  $("snapshot-json").textContent = snapshotJSON;
}
$("copy-patch").addEventListener("click", () => copy(patchExample));
$("copy-snapshot").addEventListener("click", () => copy(snapshotJSON));
function markdown() {
  const lines = [
    "# " + data.title,
    "",
    ...(isDemo
      ? ["_Demo: fictional task data. No agent is running._", ""]
      : []),
    data.summary,
    "",
    "Project: " + state.project,
    "Status: " + data.phase + " · Revision " + state.revision,
    "Published: " + state.updated_at,
    "",
    "## Plan",
    "",
  ];
  for (const t of data.tasks)
    lines.push(
      "- [" +
        (t.status === "done" ? "x" : " ") +
        "] " +
        t.title +
        " (" +
        t.status +
        ")" +
        (t.detail ? " — " + t.detail : ""),
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
  const { key, presentation, custom_css, commands, ...source } = state;
  download(
    "task-lantern-" + state.run + ".json",
    JSON.stringify(source, null, 2),
    "application/json",
  );
});
$("copy-summary").addEventListener("click", () => {
  const c = counts(state);
  copy(
    (isDemo ? "Demo: fictional task data.\n" : "") +
      data.title +
      "\n" +
      data.summary +
      "\n" +
      c.done +
      "/" +
      c.total +
      " complete · " +
      c.questions +
      " decisions · " +
      c.blocked +
      " blockers\nPublished " +
      state.updated_at,
  );
});
function refreshLabel() {
  const terminal =
    workspace.scope === "thread" &&
    state &&
    ["complete", "paused"].includes(data.phase);
  $("refresh").textContent = isDemo
    ? "Reload demo"
    : terminal
      ? "Refresh now"
      : workspaceUI.paused
        ? "Resume refresh"
        : "Pause refresh";
  $("refresh").setAttribute("aria-pressed", String(!!workspaceUI.paused));
}
$("refresh").addEventListener("click", () => {
  if (
    isDemo ||
    (workspace.scope === "thread" &&
      ["complete", "paused"].includes(data.phase))
  ) {
    location.reload();
    return;
  }
  workspaceUI.paused = !workspaceUI.paused;
  saveWorkspace();
  refreshLabel();
  freshness();
});
function freshness() {
  if (!state) return;
  if (isDemo) {
    $("freshness").textContent = "Sample data";
    $("freshness").classList.remove("stale");
    return;
  }
  const seconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(state.updated_at).getTime()) / 1000),
    ),
    age =
      seconds < 60
        ? seconds + "s"
        : seconds < 3600
          ? Math.floor(seconds / 60) + "m"
          : Math.floor(seconds / 3600) + "h",
    terminal = ["complete", "paused"].includes(data.phase);
  $("freshness").classList.toggle("stale", seconds > 120 && !terminal);
  $("freshness").textContent = workspaceUI.paused
    ? "Refresh paused"
    : seconds > 120 && !terminal
      ? "No update for " + age
      : "Published " + age + " ago";
  $("freshness").title =
    "Last publication: " +
    new Date(state.updated_at).toLocaleString() +
    ". This is a reported snapshot, not a process monitor.";
}
const routeParams = new URLSearchParams(location.hash.slice(1));
const first = [
  routeParams.get("thread"),
  workspaceUI.selected,
  workspace.selected,
  threads.find((t) => t.snapshot.phase !== "complete")?.key,
  threads[0]?.key,
].find((key) => threads.some((t) => t.key === key));
if (first) {
  selectThread(first, true);
  const detail = routeParams.get("detail");
  if (sections.includes(detail) && !(ui.open?.[detail] && ui.scroll))
    requestAnimationFrame(() => openDetail(detail));
} else {
  $("workspace-empty").hidden = false;
  $("thread-content").hidden = true;
  drawThreads();
}
window.addEventListener("hashchange", () => {
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.get("thread") !== state?.key) selectThread(params.get("thread"));
  if (sections.includes(params.get("detail"))) openDetail(params.get("detail"));
});
window.addEventListener(
  "scroll",
  () => {
    if (ui) {
      ui.scroll = window.scrollY;
      save();
    }
  },
  { passive: true },
);
document.addEventListener("keydown", (event) => {
  const input = ["INPUT", "TEXTAREA", "SELECT"].includes(
    document.activeElement.tagName,
  );
  if (
    event.key === "/" &&
    !input &&
    !document.querySelector("dialog[open]") &&
    state &&
    !(sidebarOpen && mobile.matches)
  ) {
    event.preventDefault();
    openDetail("plan");
    $("task-search").focus({ preventScroll: true });
  }
  if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
    if (sidebarOpen && mobile.matches) toggleSidebar(false, true);
    else if (document.activeElement === $("task-search")) {
      $("task-search").value = "";
      filterTasks();
      $("task-search").blur();
    }
  }
});
setInterval(freshness, 1000);
setInterval(() => {
  const terminal =
    workspace.scope === "thread" &&
    state &&
    ["complete", "paused"].includes(data.phase);
  if (
    !isDemo &&
    !workspaceUI.paused &&
    !terminal &&
    !document.hidden &&
    !document.querySelector("dialog[open]") &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
  ) {
    save();
    saveWorkspace();
    location.reload();
  }
}, 10000);

document.addEventListener("keydown", (event) => {
  if (
    event.key !== "Tab" ||
    !sidebarOpen ||
    !mobile.matches ||
    document.querySelector("dialog[open]")
  )
    return;
  const items = [
    ...$("thread-sidebar").querySelectorAll("button,input"),
  ].filter((e) => e.getClientRects().length);
  const first = items[0],
    last = items.at(-1);
  if (
    event.shiftKey &&
    (document.activeElement === first ||
      !$("thread-sidebar").contains(document.activeElement))
  ) {
    event.preventDefault();
    last?.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last ||
      !$("thread-sidebar").contains(document.activeElement))
  ) {
    event.preventDefault();
    first?.focus();
  }
});
