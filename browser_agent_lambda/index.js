const { AccessToken, RoomServiceClient, AgentDispatchClient } = require("livekit-server-sdk");

// ===== CONFIG (ENV VARS) =====
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

// ===== CLIENTS =====
const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);
const agentDispatch = new AgentDispatchClient(LIVEKIT_URL, API_KEY, API_SECRET);

// ===== HELPER: normalize path =====
function normalizePath(rawPath) {
  // remove stage + base path (adjust if you change API Gateway config)
  return rawPath.replace(/^\/prod\/browser_agent/, "") || "/";
}

// ===== HANDLER =====
exports.handler = async (event) => {
  const rawPath = event.rawPath || "/";
  const method = event.requestContext?.http?.method || "GET";

  const path = normalizePath(rawPath);

  console.log("➡️ Raw path:", rawPath);
  console.log("➡️ Normalized path:", path);
  console.log("➡️ Method:", method);

  try {
    // ===== TOKEN ENDPOINT =====
    if (path === "/token" && method === "GET") {
      const identity = "user-" + Math.floor(Math.random() * 10000);
      const roomName = "room-" + identity;

      const at = new AccessToken(API_KEY, API_SECRET, { identity });
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
      });

      const token = await at.toJwt();

      console.log("✅ Generated token for:", identity, "room:", roomName);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        body: JSON.stringify({ token, roomName }),
      };
    }

    // ===== START AGENT =====
    if (path === "/start-agent" && method === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { roomName } = body;

      if (!roomName) {
        return {
          statusCode: 400,
          headers: corsHeaders(),
          body: JSON.stringify({ error: "roomName is required" }),
        };
      }

      console.log("📡 Dispatching agent to room:", roomName);

      await agentDispatch.createDispatch(roomName, "voice-bot");

      console.log("🚀 Agent dispatch sent");

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: true }),
      };
    }

    // ===== HEALTH =====
    if (path === "/" && method === "GET") {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: "Server is running",
      };
    }

    // ===== OPTIONS (CORS preflight) =====
    if (method === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: "",
      };
    }

    // ===== NOT FOUND =====
    return {
      statusCode: 404,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Not found", path }),
    };

  } catch (err) {
    console.error("❌ ERROR:", err);

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// ===== CORS HELPER =====
function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}