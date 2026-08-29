const http = require("http");
const { google } = require("googleapis");

const PORT = process.env.PORT || 10000;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const REDIRECT_URI =
  "https://blackjack-live-bot.onrender.com/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl"
];

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/") {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
      });

      res.end(`
        <h1>🃏 Blackjack Live Bot</h1>
        <p>🤖 Bot online!</p>
        <p><a href="/auth">🔐 Conectar ao Google/YouTube</a></p>
      `);

      return;
    }

    if (req.url === "/auth") {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: SCOPES
      });

      res.writeHead(302, {
        Location: authUrl
      });

      res.end();
      return;
    }

    if (req.url.startsWith("/oauth2callback")) {
      const url = new URL(
        req.url,
        `https://blackjack-live-bot.onrender.com`
      );

      const code = url.searchParams.get("code");

      if (!code) {
        res.writeHead(400, {
          "Content-Type": "text/plain; charset=utf-8"
        });

        res.end("❌ Código de autorização não recebido.");
        return;
      }

      const { tokens } = await oauth2Client.getToken(code);

      console.log("✅ Autorização do Google concluída!");

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
      });

      res.end(`
        <h1>✅ YouTube autorizado!</h1>
        <p>O Google autorizou o Blackjack Live Bot.</p>
        <p>Agora precisamos guardar o Refresh Token no Render.</p>
        <p>Verifique os logs do Render.</p>
      `);

      if (tokens.refresh_token) {
        console.log("========================================");
        console.log("🔐 REFRESH TOKEN:");
        console.log(tokens.refresh_token);
        console.log("========================================");
      } else {
        console.log("⚠️ Nenhum refresh token foi retornado.");
      }

      return;
    }

    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("404 - Página não encontrada.");

  } catch (error) {
    console.error("❌ Erro:", error);

    res.writeHead(500, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("❌ Ocorreu um erro. Verifique os logs do Render.");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🃏 Blackjack Live Bot online na porta ${PORT}`);
  console.log("📺 Acesse /auth para conectar ao YouTube.");
});
