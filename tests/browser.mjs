// Optional browser smoke checks + real README screenshots. Node 22+ and Chrome.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  mkdir,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const chrome =
  process.env.CHROME_PATH ||
  (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "google-chrome");
const profile = await mkdtemp(join(tmpdir(), "task-lantern-chrome-"));
const child = spawn(
  chrome,
  [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    "--user-data-dir=" + profile,
    "about:blank",
  ],
  { stdio: "ignore" },
);
let launchError;
child.on("error", (error) => {
  launchError = error;
});
let socket;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError;
    try {
      port = (
        await readFile(join(profile, "DevToolsActivePort"), "utf8")
      ).split("\n")[0];
      break;
    } catch {
      await sleep(100);
    }
  }
  assert.ok(port, "Chrome debugging endpoint did not start");
  const target = await (
    await fetch("http://127.0.0.1:" + port + "/json/new?about:blank", {
      method: "PUT",
    })
  ).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let next = 0;
  const pending = new Map(),
    errors = [],
    network = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails);
    if (
      message.method === "Network.requestWillBeSent" &&
      /^https?:/.test(message.params.request.url)
    )
      network.push(message.params.request.url);
    const entry = pending.get(message.id);
    if (entry) {
      pending.delete(message.id);
      clearTimeout(entry.timeout);
      message.error
        ? entry.reject(new Error(JSON.stringify(message.error)))
        : entry.resolve(message.result);
    }
  });
  const call = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error("CDP timeout: " + method));
      }, 15000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Network.enable");
  const load = async (path) => {
    await call("Page.navigate", { url: pathToFileURL(path).href });
    for (let n = 0; n < 100; n++) {
      await sleep(50);
      if (
        await evaluate(
          'document.readyState === "complete" && !!document.querySelector("#title").textContent',
        )
      )
        return;
    }
    throw new Error("Dashboard did not render");
  };
  const assets = join(root, "docs/assets");
  await mkdir(assets, { recursive: true });
  const metrics = async (width, height) =>
    call("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 500,
    });
  const screenshot = async (name, full = false) => {
    const shot = await call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: full,
    });
    await writeFile(join(assets, name), Buffer.from(shot.data, "base64"));
  };
  await metrics(1440, 1000);
  await load(join(root, "examples/demo-light.html"));
  assert.equal(
    await evaluate('document.querySelectorAll(".thread-item").length'),
    5,
  );
  assert.equal(
    await evaluate(
      'document.querySelectorAll("#detail-stack > details[open]").length',
    ),
    0,
  );
  assert.equal(
    await evaluate('document.querySelector("#current-task").textContent'),
    "Verify keyboard navigation",
  );
  assert.equal(await evaluate('document.querySelector("progress").value'), 3);
  assert.equal(
    await evaluate('document.querySelector("#freshness").textContent'),
    "Sample data",
  );
  await screenshot("dashboard-overview.png");
  await screenshot("dashboard-light.png");
  await screenshot("dashboard-workspace.png");
  await evaluate('document.querySelector("[data-detail=decisions]").click()');
  await sleep(350);
  assert.equal(
    await evaluate('document.querySelector("#decisions-details").open'),
    true,
  );
  assert.equal(
    await evaluate(
      'document.querySelector(".decision-row").classList.contains("required")',
    ),
    true,
  );
  assert.equal(
    await evaluate(
      'document.querySelectorAll("#thread-sidebar .thread-item").length',
    ),
    5,
  );
  await screenshot("dashboard-decisions.png");
  await evaluate(
    'document.querySelector("#decisions-details").open=false;window.scrollTo(0,0);document.querySelector("#current-task").click()',
  );
  await sleep(350);
  assert.equal(
    await evaluate('document.querySelector("#plan-details").open'),
    true,
  );
  await evaluate(
    'document.querySelector("#task-search").value="keyboard";document.querySelector("#task-search").dispatchEvent(new Event("input"))',
  );
  assert.equal(
    await evaluate(
      'Array.from(document.querySelectorAll(".task-row")).filter(e=>!e.hidden).length',
    ),
    1,
  );
  await evaluate(
    'document.querySelector("#task-filter").value="done";document.querySelector("#task-filter").dispatchEvent(new Event("change"))',
  );
  assert.equal(
    await evaluate('document.querySelector("#task-empty").hidden'),
    false,
  );
  await evaluate(
    'document.querySelector("#task-filter").value="all";document.querySelector("#task-filter").dispatchEvent(new Event("change"))',
  );
  const firstKey = await evaluate("state.key");
  await evaluate('selectThread(threads.find(t=>t.project==="Billing").key)');
  assert.equal(
    await evaluate('document.querySelector("#title").textContent'),
    "Migrate the billing API",
  );
  assert.equal(
    await evaluate('document.querySelector("#current-task").textContent'),
    "Check webhook retries",
  );
  assert.equal(
    await evaluate(
      'document.querySelectorAll("#detail-stack > details[open]").length',
    ),
    0,
  );
  assert.equal(
    await evaluate('document.querySelector("#task-search").value'),
    "",
  );
  await evaluate("selectThread(" + JSON.stringify(firstKey) + ")");
  assert.equal(
    await evaluate('document.querySelector("#task-search").value'),
    "keyboard",
  );
  assert.equal(
    await evaluate('document.querySelector("#plan-details").open'),
    true,
  );
  await call("Page.reload");
  await sleep(300);
  assert.equal(await evaluate("state.key"), firstKey);
  assert.equal(
    await evaluate('document.querySelector("#plan-details").open'),
    true,
  );
  await evaluate(
    'document.querySelector("#task-search").value="";document.querySelector("#task-search").dispatchEvent(new Event("input"));document.querySelector("#task-search").blur();document.querySelector("#plan-details").open=false;window.scrollTo(0,0)',
  );
  const beforeWidth = await evaluate(
    'document.querySelector("main").getBoundingClientRect().width',
  );
  await evaluate('document.querySelector("#toggle-threads").click()');
  assert.equal(
    await evaluate(
      'document.querySelector("#toggle-threads").getAttribute("aria-expanded")',
    ),
    "false",
  );
  assert.ok(
    (await evaluate(
      'document.querySelector("main").getBoundingClientRect().width',
    )) > beforeWidth,
  );
  await screenshot("dashboard-focus.png");
  await evaluate(
    'document.querySelector("#toggle-threads").click();document.querySelector("#thread-search").value="Billing";document.querySelector("#thread-search").dispatchEvent(new Event("input"))',
  );
  assert.equal(
    await evaluate('document.querySelectorAll(".thread-item").length'),
    1,
  );
  await evaluate(
    'document.querySelector("#thread-search").value="";document.querySelector("#thread-search").dispatchEvent(new Event("input"));document.querySelector("#thread-search").blur();document.querySelector("[data-thread-filter=attention]").click()',
  );
  assert.equal(
    await evaluate('document.querySelectorAll(".thread-item").length'),
    2,
  );
  await evaluate('document.querySelector("[data-thread-filter=all]").click()');
  assert.equal(await evaluate('safeWebLink("javascript:alert(1)")'), null);
  assert.equal(
    await evaluate('safeWebLink("https://user:pass@example.com")'),
    null,
  );
  await evaluate(
    'Object.defineProperty(navigator,"clipboard",{value:{writeText:()=>Promise.reject(new Error("blocked"))},configurable:true});document.querySelector(".decision-action button").click()',
  );
  await sleep(100);
  assert.equal(
    await evaluate('document.querySelector("#copy-dialog").open'),
    true,
  );
  assert.ok(
    await evaluate(
      'document.querySelector("#copy-text").value.includes("Question publish:")',
    ),
  );
  await evaluate('document.querySelector("#close-copy").click()');
  const downloadDir = join(profile, "downloads");
  await mkdir(downloadDir);
  await call("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDir,
  });
  await evaluate(
    'document.querySelector("#export").click();document.querySelector("#export-json").click();document.querySelector("#export-markdown").click()',
  );
  for (let n = 0; n < 50; n++) {
    if (
      (await readdir(downloadDir)).filter((n) => !n.endsWith(".crdownload"))
        .length >= 2
    )
      break;
    await sleep(100);
  }
  const downloads = await readdir(downloadDir),
    exported = JSON.parse(
      await readFile(
        join(
          downloadDir,
          downloads.find((n) => n.endsWith(".json")),
        ),
        "utf8",
      ),
    );
  assert.equal(exported.snapshot.tasks.length, 6);
  assert.equal(exported.threads, undefined);
  assert.equal(exported.commands, undefined);
  assert.ok(
    (
      await readFile(
        join(
          downloadDir,
          downloads.find((n) => n.endsWith(".md")),
        ),
        "utf8",
      )
    ).includes("fictional task data"),
  );
  await evaluate(
    'document.querySelector("#close-export").click();openDetail("developer")',
  );
  await sleep(350);
  assert.equal(
    await evaluate('document.querySelector("#developer-details").open'),
    true,
  );
  assert.equal(
    await evaluate(
      'JSON.parse(document.querySelector("#snapshot-json").textContent).tasks.length',
    ),
    6,
  );
  assert.ok(
    await evaluate(
      'document.querySelector("#commands").textContent.includes("--expected-revision 2")',
    ),
  );
  await new Promise((resolve) => setTimeout(resolve, 2600));
  await screenshot("dashboard-developer.png");
  await evaluate(
    'document.querySelector("#developer-details").open=false;window.scrollTo(0,0);document.querySelector("#theme").click()',
  );
  await sleep(2600);
  await screenshot("dashboard-dark.png");
  await call("Page.reload");
  await sleep(300);
  assert.equal(
    await evaluate('document.body.classList.contains("dark")'),
    true,
  );
  await evaluate('document.querySelector("#theme").click()');
  await evaluate(
    'for(const d of document.querySelectorAll("#detail-stack > details"))d.open=false;route();window.scrollTo(0,0)',
  );
  await sleep(100);
  await metrics(390, 844);
  await evaluate("window.scrollTo(0,0)");
  await sleep(150);
  assert.equal(
    await evaluate("document.documentElement.scrollWidth<=window.innerWidth"),
    true,
    "Mobile horizontal overflow",
  );
  assert.equal(
    await evaluate(
      'document.querySelector("#toggle-threads").getAttribute("aria-expanded")',
    ),
    "false",
  );
  await screenshot("dashboard-mobile.png");
  await evaluate('document.querySelector("#toggle-threads").click()');
  assert.equal(await evaluate('document.querySelector("main").inert'), true);
  assert.equal(
    await evaluate(
      'document.querySelector("#thread-sidebar").getAttribute("aria-modal")',
    ),
    "true",
  );
  await screenshot("dashboard-mobile-threads.png");
  await evaluate(
    'document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))',
  );
  assert.equal(await evaluate('document.querySelector("main").inert'), false);
  assert.equal(await evaluate("document.activeElement.id"), "toggle-threads");
  await metrics(1440, 1000);
  // Exercise actual cross-project publishers and the single HTML refresh, not a mock fixture.
  const project = join(profile, "project a"),
    other = join(profile, "project b");
  await mkdir(project);
  await mkdir(other);
  const publisher = join(root, "skills/task-lantern/scripts/dashboard.py");
  const cli = (project, ...args) =>
    JSON.parse(
      execFileSync(
        process.env.PYTHON || "python3",
        [publisher, "--project", project, ...args],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            XDG_CONFIG_HOME: join(profile, "config"),
            XDG_DATA_HOME: join(profile, "data"),
          },
        },
      ),
    );
  const a = cli(project, "init", "--title", "Live search", "--host", "claude"),
    b = cli(other, "init", "--title", "Live billing", "--host", "codex");
  cli(
    project,
    "publish",
    a.run,
    "--input",
    join(root, "examples/snapshot.json"),
    "--expected-revision",
    "0",
  );
  await load(a.dashboard);
  assert.equal(await evaluate("threads.length"), 2);
  await evaluate(
    "selectThread(threads.find(t=>t.run===" + JSON.stringify(a.run) + ").key)",
  );
  await evaluate(
    'openDetail("plan");document.querySelector("#task-search").value="keyboard";document.querySelector("#task-search").dispatchEvent(new Event("input"));document.querySelector("#task-search").focus()',
  );
  const patchFile = join(profile, "update.json");
  await writeFile(
    patchFile,
    JSON.stringify({ summary: "A real publication reached the workspace." }),
  );
  cli(
    project,
    "patch",
    a.run,
    "--input",
    patchFile,
    "--expected-revision",
    "1",
  );
  // No reload while typing; blur and wait for the next real ten-second timer.
  await sleep(10500);
  assert.notEqual(
    await evaluate('document.querySelector("#summary").textContent'),
    "A real publication reached the workspace.",
  );
  await evaluate('document.querySelector("#task-search").blur()');
  await sleep(10500);
  assert.equal(
    await evaluate('document.querySelector("#summary").textContent'),
    "A real publication reached the workspace.",
  );
  assert.equal(
    await evaluate('document.querySelector("#task-search").value'),
    "keyboard",
  );
  assert.equal(
    await evaluate('document.querySelector("#plan-details").open'),
    true,
  );
  assert.equal(await evaluate("state.run"), a.run);
  assert.equal(await evaluate("threads.length"), 2);
  await evaluate('document.querySelector("#refresh").click()');
  assert.equal(
    await evaluate('document.querySelector("#refresh").textContent'),
    "Resume refresh",
  );
  await call("Page.reload");
  await sleep(300);
  assert.equal(
    await evaluate('document.querySelector("#refresh").textContent'),
    "Resume refresh",
  );
  // Brand graphics retain real SVG captures.
  for (const [name, width, height] of [
    ["hero", 1600, 560],
    ["social-preview", 1280, 640],
  ]) {
    await metrics(width, height);
    await call("Page.navigate", {
      url: pathToFileURL(join(assets, name + ".svg")).href,
    });
    await sleep(150);
    await screenshot(name + ".png");
  }
  assert.deepEqual(network, [], "Offline dashboard made network requests");
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log(
    "PASS: single-page cross-project workspace, progressive disclosure, thread switching, selection/search persistence, collapse/expand, mobile drawer and focus, theme, safe links, clipboard fallback, selected-thread exports, real publisher refresh and pause, no network/runtime errors.",
  );
} finally {
  if (socket) socket.close();
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    const timer = setTimeout(resolve, 3000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 200,
  });
}
