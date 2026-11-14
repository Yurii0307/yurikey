import express from "express";
import fs from "node:fs";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Mock device hardware info for desktop dev
app.get("/json/device-info.json", (_req, res) => {
  res.json({
    android: "15 (VanillaIceCream)",
    kernel: "6.6.30-android15-dev",
    root: "KernelSU-Next (Dev Mock)",
  });
});

app.get("/__dev/mock-ksu.js", (_req, res) => {
  res.sendFile("dev/mock-ksu.js", { root: "." });
});

// Inject mock bridge script into index.html
app.get(["/", "/index.html"], (_req, res) => {
  const html = fs.readFileSync("Module/webroot/index.html", "utf-8");
  res.send(html.replace("</head>", '  <script src="/__dev/mock-ksu.js"></script>\n</head>'));
});

// Serve all static webroot assets (CSS, JS, fonts, lang)
app.use(express.static("Module/webroot"));

app.listen(PORT, () => {
  console.log(`✔ Yurikey Dev Server running at http://localhost:${PORT}`);
});
