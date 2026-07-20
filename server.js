const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 80);

// Белый список: отдаём только то, что перечислено здесь. Никакой склейки
// путей из req.url — это отсекает обход каталога по построению.
const ASSETS = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/questions.js": { file: "questions.js", type: "application/javascript; charset=utf-8" }
};

const server = http.createServer((req, res) => {
  const asset = ASSETS[req.url.split("?")[0]];
  if (!asset) {
    res.writeHead(302, { Location: "/" });
    res.end();
    return;
  }

  let body;
  try {
    body = fs.readFileSync(path.join(__dirname, asset.file));
  } catch (e) {
    // questions.js может отсутствовать — приложение это переживает
    // (typeof QUESTIONS === "undefined" → режим чекбоксов).
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": asset.type,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`AI Agents RPG map listening on ${port}`);
});
