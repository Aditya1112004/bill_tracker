const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const http = require("http");

let win;
let serverProcess;

function getServerScriptPath() {
  // __dirname points to the unpacked app directory in dev, and to 'resources/app.asar' in production
  // app.js is included in the files array, so it's always available
  return path.join(__dirname, 'app.js');
}

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
    },
  });
  win.loadURL("http://localhost:3000");
}

function waitForServer(url, timeoutMs = 20000, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    const endBy = Date.now() + timeoutMs;
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > endBy) return reject(new Error("Server not reachable: " + url));
        setTimeout(attempt, intervalMs);
      });
      req.setTimeout(2000, () => {
        req.destroy(new Error("timeout"));
      });
    };
    attempt();
  });
}

async function ensureServerAndOpenWindow() {
  const url = "http://localhost:3000";
  let serverAlreadyRunning = false;
  try {
    // Quick probe to see if something is already listening
    await waitForServer(url, 1000, 250);
    serverAlreadyRunning = true;
  } catch (_) {}

  if (!serverAlreadyRunning) {
    // Start Express server as a child process
    const userDataPath = app.isPackaged ? app.getPath("userData") : __dirname;
    serverProcess = fork(getServerScriptPath(), {
      env: {
        USER_DATA_PATH: userDataPath,
        PORT: "3000",
        APP_VERSION: app.getVersion(),
        IS_PACKAGED: app.isPackaged ? "1" : "0",
      },
    });

    serverProcess.on("exit", (code, signal) => {
      console.error(`[server] exited with code ${code}, signal ${signal}`);
    });
    serverProcess.on("error", (err) => {
      console.error("[server] process error:", err);
    });
  }

  try {
    // Wait until server is reachable (covers slower machines)
    await waitForServer(url, 30000, 500);
  } catch (err) {
    console.error("Timed out waiting for server:", err);
    // Show a friendly dialog but still open the window (it may load later)
    try {
      dialog.showErrorBox("Server not ready", "The local server at http://localhost:3000 did not respond in time. The window will still open; please try reloading in a few seconds.");
    } catch (_) {}
  }

  createWindow();
}

app.whenReady().then(() => {
  ensureServerAndOpenWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
