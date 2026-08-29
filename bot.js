const http = require("http");
const { google } = require("googleapis");

const PORT = process.env.PORT || 10000;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

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

let youtube = null;
let liveChatId = null;
let nextPageToken = null;
let chatRunning = false;
let pollingTimer = null;

/* =========================================================
   CONEXÃO COM O GOOGLE
========================================================= */

if (REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
  });

  youtube = google.youtube({
    version: "v3",
    auth: oauth2Client
  });

  console.log("🔐 Refresh Token encontrado.");
} else {
  console.log("⚠️ GOOGLE_REFRESH_TOKEN não encontrado.");
}

/* =========================================================
   PROCURAR A LIVE ATIVA
========================================================= */

async function findLiveChat() {
  if (!youtube) {
    console.log("❌ YouTube não está conectado.");
    return false;
  }

  try {
    const response = await youtube.liveBroadcasts.list({
      part: "snippet,contentDetails,status",
      mine: true,
      maxResults: 10
    });

    const broadcasts = response.data.items || [];

    const live = broadcasts.find(
      broadcast =>
        broadcast.status &&
        broadcast.status.lifeCycleStatus === "live"
    );

    if (!live) {
      console.log("📺 Nenhuma transmissão ao vivo encontrada.");
      return false;
    }

    liveChatId = live.contentDetails.activeLiveChatId;

    if (!liveChatId) {
      console.log("⚠️ A Live não possui um Live Chat ativo.");
      return false;
    }

    console.log("========================================");
    console.log("📺 LIVE ENCONTRADA!");
    console.log(`🆔 Live Chat ID: ${liveChatId}`);
    console.log(`🎬 Título: ${live.snippet.title}`);
    console.log("========================================");

    return true;

  } catch (error) {
    console.error(
      "❌ Erro ao procurar a Live:",
      error.response?.data || error.message
    );

    return false;
  }
}

/* =========================================================
   LER O CHAT
========================================================= */

async function readChat() {
  if (!youtube || !liveChatId) {
    return;
  }

  try {
    const response = await youtube.liveChatMessages.list({
      liveChatId: liveChatId,
      part: "id,snippet,authorDetails",
      pageToken: nextPageToken,
      maxResults: 200
    });

    const messages = response.data.items || [];

    nextPageToken = response.data.nextPageToken;

    for (const message of messages) {
      const author =
        message.authorDetails?.displayName || "Jogador";

      const channelId =
        message.authorDetails?.channelId || "";

      const text =
        message.snippet?.displayMessage || "";

      console.log(
        `💬 ${author} (${channelId}): ${text}`
      );

      processCommand(author, channelId, text);
    }

    const delay =
      response.data.pollingIntervalMillis || 5000;

    clearTimeout(pollingTimer);

    pollingTimer = setTimeout(
      readChat,
      delay
    );

  } catch (error) {
    console.error(
      "❌ Erro ao ler o chat:",
      error.response?.data || error.message
    );

    clearTimeout(pollingTimer);

    pollingTimer = setTimeout(
      readChat,
      10000
    );
  }
}

/* =========================================================
   COMANDOS DO BLACKJACK
========================================================= */

function processCommand(author, channelId, text) {

  const command = text.trim().toUpperCase();

  if (command === "BLACKJACK") {
    console.log(
      `🃏 ${author} quer entrar na mesa!`
    );

    // FUTURO:
    // adicionar jogador à mesa
    // guardar channelId
    // dar 3 vidas
  }

  if (command === "1") {
    console.log(
      `🃏 ${author} (${channelId}) escolheu PEDIR CARTA.`
    );

    // FUTURO:
    // verificar se é a vez desse jogador
    // dar carta
  }

  if (command === "2") {
    console.log(
      `✋ ${author} (${channelId}) escolheu PARAR.`
    );

    // FUTURO:
    // verificar se é a vez desse jogador
    // passar para o próximo
  }
}

/* =========================================================
   INICIAR LEITURA DO CHAT
========================================================= */

async function startChatBot() {

  if (chatRunning) {
    return;
  }

  if (!youtube) {
    console.log(
      "⚠️ Bot ainda não possui autenticação do YouTube."
    );
    return;
  }

  console.log("🔎 Procurando uma Live ativa...");

  const found = await findLiveChat();

  if (!found) {
    console.log(
      "📺 Aguardando uma Live ativa..."
    );

    setTimeout(
      startChatBot,
      15000
    );

    return;
  }

  chatRunning = true;

  console.log(
    "🟢 LEITURA DO CHAT INICIADA!"
  );

  readChat();
}

/* =========================================================
   SERVIDOR
========================================================= */

const server = http.createServer(
  async (req, res) => {

    try {

      if (req.url === "/") {

        res.writeHead(200, {
          "Content-Type":
            "text/html; charset=utf-8"
        });

        res.end(`
          <h1>🃏 Blackjack Live Bot</h1>

          <p>🤖 Bot online!</p>

          <p>
            YouTube:
            ${
              youtube
                ? "✅ Conectado"
                : "❌ Não conectado"
            }
          </p>

          <p>
            Live Chat:
            ${
              liveChatId
                ? "🟢 Ativo"
                : "⚪ Aguardando Live"
            }
          </p>

          <p>
            <a href="/auth">
              🔐 Conectar ao Google/YouTube
            </a>
          </p>
        `);

        return;
      }

      /* =========================================
         AUTORIZAÇÃO
      ========================================= */

      if (req.url === "/auth") {

        const authUrl =
          oauth2Client.generateAuthUrl({
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

      /* =========================================
         CALLBACK DO GOOGLE
      ========================================= */

      if (
        req.url.startsWith(
          "/oauth2callback"
        )
      ) {

        const url = new URL(
          req.url,
          "https://blackjack-live-bot.onrender.com"
        );

        const code =
          url.searchParams.get("code");

        if (!code) {

          res.writeHead(400, {
            "Content-Type":
              "text/plain; charset=utf-8"
          });

          res.end(
            "❌ Código de autorização não recebido."
          );

          return;
        }

        const { tokens } =
          await oauth2Client.getToken(code);

        console.log(
          "✅ Autorização do Google concluída!"
        );

        if (tokens.refresh_token) {

          console.log(
            "========================================"
          );

          console.log(
            "🔐 REFRESH TOKEN:"
          );

          console.log(
            tokens.refresh_token
          );

          console.log(
            "========================================"
          );
        }

        res.writeHead(200, {
          "Content-Type":
            "text/html; charset=utf-8"
        });

        res.end(`
          <h1>✅ YouTube autorizado!</h1>

          <p>
            O Google autorizou o Blackjack Live Bot.
          </p>

          <p>
            Agora coloque o Refresh Token
            nas Environment Variables do Render.
          </p>

          <p>
            Depois faça um novo deploy.
          </p>
        `);

        return;
      }

      /* =========================================
         STATUS
      ========================================= */

      if (req.url === "/status") {

        res.writeHead(200, {
          "Content-Type":
            "application/json; charset=utf-8"
        });

        res.end(
          JSON.stringify({
            bot: "online",
            youtube: !!youtube,
            liveChat: !!liveChatId,
            chatRunning: chatRunning
          })
        );

        return;
      }

      /* =========================================
         404
      ========================================= */

      res.writeHead(404, {
        "Content-Type":
          "text/plain; charset=utf-8"
      });

      res.end(
        "404 - Página não encontrada."
      );

    } catch (error) {

      console.error(
        "❌ Erro:",
        error.response?.data ||
        error.message
      );

      res.writeHead(500, {
        "Content-Type":
          "text/plain; charset=utf-8"
      });

      res.end(
        "❌ Ocorreu um erro. Verifique os logs do Render."
      );
    }
  }
);

/* =========================================================
   INICIAR SERVIDOR
========================================================= */

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `🃏 Blackjack Live Bot online na porta ${PORT}`
    );

    console.log(
      "📺 Aguardando configuração do YouTube..."
    );

    startChatBot();
  }
);
