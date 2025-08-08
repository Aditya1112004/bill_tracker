const { app, BrowserWindow } = require("electron");
const path = require("path");
const { fork } = require("child_process");

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

app.whenReady().then(() => {
  // Start Express server as a child process
  serverProcess = fork(getServerScriptPath(), {
    env: {
      USER_DATA_PATH: app.getPath('userData'),
    },
  });

  // Wait a few seconds for the server to start (adjustable)
  setTimeout(() => {
    createWindow();
  }, 4000); // 4 seconds delay
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
