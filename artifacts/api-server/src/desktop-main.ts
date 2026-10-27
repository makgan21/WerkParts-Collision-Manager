import { app, BrowserWindow, dialog } from "electron";
import express from "express";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;
let server: Server | null = null;
let closeDatabase: (() => void) | null = null;

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    try {
      process.env.NODE_ENV = "production";
      const portableDirectory = process.env.PORTABLE_EXECUTABLE_DIR;
      const databaseDirectory = portableDirectory
        ? path.join(portableDirectory, "WerkPartsData")
        : app.getPath("userData");
      const databasePath = path.join(databaseDirectory, "werkparts.sqlite");
      mkdirSync(path.dirname(databasePath), { recursive: true });

      if (!existsSync(databasePath)) {
        const catalogSeedPath = app.isPackaged
          ? path.join(process.resourcesPath, "catalog-seed.sqlite")
          : path.resolve(app.getAppPath(), "desktop", "catalog-seed.sqlite");

        if (!existsSync(catalogSeedPath)) {
          throw new Error("The installer is missing its parts catalog database.");
        }
        copyFileSync(catalogSeedPath, databasePath);
      }

      // Set the per-shop database location before importing the API or database.
      process.env.WERKPARTS_DB_PATH = databasePath;
      const [{ default: apiApp }, databaseModule] = await Promise.all([
        import("./app"),
        import("@workspace/db"),
      ]);
      closeDatabase = databaseModule.closeDatabase;

      const publicDirectory = path.join(app.getAppPath(), "dist", "public");
      apiApp.use(express.static(publicDirectory, { index: false }));
      apiApp.get("/{*splat}", (req, res) => {
        if (req.path === "/api" || req.path.startsWith("/api/")) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        res.sendFile(path.join(publicDirectory, "index.html"));
      });

      server = await new Promise<Server>((resolve, reject) => {
        const listeningServer = apiApp.listen(0, "127.0.0.1", () => resolve(listeningServer));
        listeningServer.once("error", reject);
      });
      const address = server.address() as AddressInfo;
      const appUrl = `http://127.0.0.1:${address.port}`;

      mainWindow = new BrowserWindow({
        width: 1440,
        height: 960,
        minWidth: 980,
        minHeight: 680,
        show: false,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });

      mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
        if (!targetUrl.startsWith(appUrl)) event.preventDefault();
      });
      mainWindow.once("ready-to-show", () => mainWindow?.show());
      mainWindow.on("closed", () => {
        mainWindow = null;
      });
      await mainWindow.loadURL(appUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown startup error";
      dialog.showErrorBox("WerkParts could not start", message);
      app.quit();
    }
  });

  app.on("before-quit", () => {
    server?.close();
    closeDatabase?.();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}
