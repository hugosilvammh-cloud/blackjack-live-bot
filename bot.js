const http = require("http");

const PORT = process.env.PORT || 10000;

// Servidor mínimo para o Render considerar o serviço saudável
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Blackjack Live Bot online 🃏");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🃏 Blackjack Live Bot online na porta ${PORT}`);
});

console.log("🤖 Bot iniciado!");
console.log("📺 Próximo passo: conectar ao YouTube Live Chat.");
