const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 80);
const indexPath = path.join(__dirname, "index.html");

const server = http.createServer((req, res) => {
  if (req.url !== "/" && req.url !== "/index.html") {
    res.writeHead(302, { Location: "/" });
    res.end();
    return;
  }

  const html = fs.readFileSync(indexPath);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(html);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`AI Agents RPG map listening on ${port}`);
});
