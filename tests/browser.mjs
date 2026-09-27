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
          'document.readyState === "complete" && !!document.querySelector("#tasks .row")',
        )
      )
        return;
    }
    throw new Error("Dashboard did not render");
  };
  const assets = join(root, "docs/assets");
  await mkdir(assets, { recursive: true });
  for (const [file, width, height, out] of [
    ["demo-dark.html", 1440, 1100, "dashboard-dark.png"],
    ["demo-light.html", 1440, 1100, "dashboard-light.png"],
    ["demo.html", 390, 844, "dashboard-mobile.png"],
  ]) {
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 500,
    });
    await load(join(root, "examples", file));
    assert.equal(
      await evaluate(
        'Array.from(document.querySelectorAll(".panel")).filter(e=>e.getClientRects().length).length',
      ),
      5,
    );
    assert.equal(
      await evaluate('document.querySelectorAll("#tasks .row").length'),
      6,
    );
    assert.equal(await evaluate('document.querySelector("progress").value'), 3);
    assert.equal(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth",
      ),
      true,
      "Horizontal overflow",
    );
    if (width < 500)
      assert.equal(
        await evaluate(
          'document.querySelector("[data-view=developer]").getBoundingClientRect().right <= window.innerWidth',
        ),
        true,
        "Developer navigation is off-screen",
      );
    const { data } = await call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(join(assets, out), Buffer.from(data, "base64"));
    if (file === "demo-light.html") {
      const preview = await call("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      await writeFile(
        join(assets, "dashboard-overview.png"),
        Buffer.from(preview.data, "base64"),
      );
    }
  }
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await load(join(root, "examples/demo.html"));
  await evaluate('document.querySelector("[data-view=developer]").click()');
  assert.equal(
    await evaluate('!document.querySelector("#developer").hidden'),
    true,
  );
  assert.equal(
    await evaluate(
      'JSON.parse(document.querySelector("#snapshot-json").textContent).tasks.length',
    ),
    6,
  );
  assert.equal(
    await evaluate(
      'document.querySelector("#commands").textContent.includes("--expected-revision 2")',
    ),
    true,
  );
  const developerImage = await call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  await writeFile(
    join(assets, "dashboard-developer.png"),
    Buffer.from(developerImage.data, "base64"),
  );
  assert.equal(
    await evaluate('document.querySelector("#freshness").textContent'),
    "Sample data",
  );
  assert.equal(
    await evaluate('document.querySelector("#refresh").textContent'),
    "Reload demo",
  );
  assert.equal(
    await evaluate('!document.querySelector("#demo-note").hidden'),
    true,
  );
  assert.ok(await evaluate('markdown().includes("fictional task data")'));
  // Switch to a non-demo fixture for live refresh/pause and stale-state checks.
  const demoSource = await readFile(join(root, "examples/demo.html"), "utf8");
  const liveSource = demoSource.replace(/("demo"\s*:\s*)true/, "$1false");
  const liveFixture = join(profile, "live-test.html");
  await writeFile(liveFixture, liveSource);
  await load(liveFixture);
  assert.equal(
    await evaluate('document.querySelector("#demo-note").hidden'),
    true,
  );
  await evaluate(
    'document.dispatchEvent(new KeyboardEvent("keydown",{key:"/",bubbles:true}))',
  );
  assert.equal(await evaluate("document.activeElement.id"), "task-search");
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
    await evaluate('!document.querySelector("#task-empty").hidden'),
    true,
  );
  await evaluate(
    'document.querySelector("#task-search").value="";document.querySelector("#task-search").dispatchEvent(new Event("input"));document.querySelector("#task-filter").value="all";document.querySelector("#task-filter").dispatchEvent(new Event("change"));document.querySelector("#task-search").blur()',
  );
  await evaluate('document.querySelector("[data-view=decisions]").click()');
  assert.equal(
    await evaluate(
      'document.querySelector(".decision-row").classList.contains("required")',
    ),
    true,
  );
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
  assert.equal(
    await evaluate(
      'document.querySelector("#copy-text").value.includes("Question publish:")',
    ),
    true,
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
      (await readdir(downloadDir)).filter(
        (name) => !name.endsWith(".crdownload"),
      ).length >= 2
    )
      break;
    await sleep(100);
  }
  const downloads = await readdir(downloadDir);
  const exported = JSON.parse(
    await readFile(
      join(
        downloadDir,
        downloads.find((name) => name.endsWith(".json")),
      ),
      "utf8",
    ),
  );
  assert.equal(exported.snapshot.tasks.length, 6);
  assert.equal(exported.commands, undefined);
  assert.ok(
    (
      await readFile(
        join(
          downloadDir,
          downloads.find((name) => name.endsWith(".md")),
        ),
        "utf8",
      )
    ).includes("## Decisions"),
  );
  await evaluate(
    'document.querySelector("#close-export").click();document.querySelector("#theme").click()',
  );
  assert.equal(
    await evaluate('document.body.classList.contains("dark")'),
    true,
  );
  await call("Page.reload");
  await sleep(300);
  assert.equal(
    await evaluate('document.body.classList.contains("dark")'),
    true,
  );
  assert.equal(
    await evaluate(
      'document.querySelector("[data-view=decisions]").getAttribute("aria-current")',
    ),
    "page",
  );
  await evaluate('document.querySelector("#refresh").click()');
  assert.equal(
    await evaluate('document.querySelector("#refresh").textContent'),
    "Resume",
  );
  await call("Page.reload");
  await sleep(300);
  assert.equal(
    await evaluate('document.querySelector("#refresh").textContent'),
    "Resume",
  );
  const source = liveSource;
  const fixture = join(profile, "refresh-test.html");
  await writeFile(fixture, source);
  await load(fixture);
  // Session storage can be shared across file URLs. Explicitly resume if needed.
  await evaluate(
    'if(document.querySelector("#refresh").textContent==="Resume")document.querySelector("#refresh").click()',
  );
  await writeFile(
    fixture,
    source.replaceAll("A better search experience.", "Refresh check passed."),
  );
  await sleep(11000);
  assert.equal(
    await evaluate('document.querySelector("h1").textContent'),
    "Refresh check passed.",
    "10-second reload did not pick up disk changes",
  );
  // Verify that stale progress is explicit and terminal runs stop refreshing.
  const envelope = JSON.parse(
    source.match(
      /<script id="state" type="application\/json">([\s\S]*?)<\/script>/,
    )[1],
  );
  envelope.updated_at = new Date(Date.now() - 180000).toISOString();
  const encode = (state) =>
    JSON.stringify(state)
      .replaceAll("<", "\\u003c")
      .replaceAll(">", "\\u003e")
      .replaceAll("&", "\\u0026");
  const fixtureHTML = (state) =>
    source.replace(
      /(<script id="state" type="application\/json">)[\s\S]*?(<\/script>)/,
      (_, a, b) => a + encode(state) + b,
    );
  const staleFile = join(profile, "stale.html");
  await writeFile(staleFile, fixtureHTML(envelope));
  await load(staleFile);
  assert.equal(
    await evaluate(
      'document.querySelector("#freshness").classList.contains("stale")',
    ),
    true,
  );
  envelope.snapshot.phase = "complete";
  for (const task of envelope.snapshot.tasks) task.status = "done";
  for (const q of envelope.snapshot.questions) {
    q.status = "answered";
    q.answer = "Keep it local.";
  }
  for (const blocker of envelope.snapshot.blockers) blocker.status = "resolved";
  const completeFile = join(profile, "complete.html");
  await writeFile(completeFile, fixtureHTML(envelope));
  await load(completeFile);
  assert.equal(
    await evaluate('document.querySelector("#refresh").textContent'),
    "Refresh now",
  );
  // The multi-run overview uses real publisher output, not a separate mock.
  const project = join(profile, "project");
  await mkdir(project);
  const publisher = join(root, "skills/task-lantern/scripts/dashboard.py");
  const cli = (...args) =>
    JSON.parse(
      execFileSync(
        process.env.PYTHON || "python3",
        [publisher, "--project", project, ...args],
        {
          encoding: "utf8",
          env: { ...process.env, XDG_CONFIG_HOME: join(profile, "config") },
        },
      ),
    );
  cli("init", "--title", "Search redesign");
  cli("init", "--title", "API migration");
  await call("Page.navigate", {
    url: pathToFileURL(join(project, ".dashboard/index.html")).href,
  });
  for (let n = 0; n < 50; n++) {
    await sleep(50);
    if (await evaluate('document.querySelectorAll("#runs .run").length===2'))
      break;
  }
  assert.equal(
    await evaluate('document.querySelectorAll("#runs .run").length'),
    2,
  );
  await evaluate(
    'document.querySelector("#search").value="API";document.querySelector("#search").dispatchEvent(new Event("input"))',
  );
  assert.equal(
    await evaluate(
      'Array.from(document.querySelectorAll("#runs .run")).filter(e=>e.getClientRects().length).length',
    ),
    1,
  );
  await evaluate(
    'document.querySelector("#search").value="";document.querySelector("#search").dispatchEvent(new Event("input"))',
  );
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const workspaceImage = await call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  await writeFile(
    join(assets, "dashboard-workspace.png"),
    Buffer.from(workspaceImage.data, "base64"),
  );
  // Raster exports of the editable vector brand assets, useful for social previews.
  for (const [name, width, height] of [
    ["hero", 1600, 560],
    ["social-preview", 1280, 640],
  ]) {
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await call("Page.navigate", {
      url: pathToFileURL(join(assets, name + ".svg")).href,
    });
    for (let n = 0; n < 50; n++) {
      await sleep(50);
      if (
        await evaluate(
          'document.readyState === "complete" && document.documentElement.tagName === "svg"',
        )
      )
        break;
    }
    assert.equal(await evaluate("document.documentElement.tagName"), "svg");
    const capture = await call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(
      join(assets, name + ".png"),
      Buffer.from(capture.data, "base64"),
    );
  }
  assert.deepEqual(network, [], "Dashboard made network requests");
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log(
    "PASS: responsive views, developer data, search/filter/keyboard, decisions, safe links, clipboard fallback, exports, UI persistence, file refresh, stale/terminal states, multi-run overview, no network or runtime errors.",
  );
  console.log("Screenshots: docs/assets/dashboard-{dark,light,mobile}.png");
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
