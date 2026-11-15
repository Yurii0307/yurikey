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

const MOCK_SCRIPTS = ["properties.js", "teesim.js", "commands.js", "index.js"]
  .map(file => `<script src="/__dev/mock-ksu/${file}"></script>`)
  .join("\n");

app.use("/__dev/mock-ksu", express.static("dev/mock-ksu"));

// Emulate the changelog bundled into the module webroot by the release build
app.get("/changelog.md", (_req, res) => {
  res.type("text/markdown").sendFile("changelog.md", { root: "." });
});

// Inject mock bridge scripts into index.html
app.get(["/", "/index.html"], (_req, res) => {
  const html = fs.readFileSync("Module/webroot/index.html", "utf-8");
  res.send(html.replace("</head>", `${MOCK_SCRIPTS}\n</head>`));
});

// Serve all static webroot assets (CSS, JS, fonts, lang)
app.use(express.static("Module/webroot"));

app.listen(PORT, () => {
  console.log(`✔ Yurikey Dev Server running at http://localhost:${PORT}`);
});
