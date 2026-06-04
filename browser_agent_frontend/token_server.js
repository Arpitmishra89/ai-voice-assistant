const express = require("express");
const { AccessToken, RoomServiceClient, AgentDispatchClient } = require("livekit-server-sdk");
const cors = require("cors");
const path = require("path");

// Load .env from the Algoflow_python_agent directory
require("dotenv").config({ path: path.resolve(__dirname, "../Algoflow_python_agent/.env") });

const app = express();
app.use(cors());
app.use(express.json());

// ===== CONFIG (ENV VARS — set these to match your LiveKit project) =====
const LIVEKIT_URL = process.env.LIVEKIT_URL || "ws://localhost:7880";
const API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";

// ===== CLIENTS =====
const roomService = new RoomServiceClient(LIVEKIT_URL, API_KEY, API_SECRET);
const agentDispatch = new AgentDispatchClient(LIVEKIT_URL, API_KEY, API_SECRET);

// ===== TOKEN ENDPOINT =====
app.get("/token", async (req, res) => {
  try {
    const identity = "user-" + Math.floor(Math.random() * 10000);
    const roomName = "room-" + identity; // ✅ unique room per user

    const at = new AccessToken(API_KEY, API_SECRET, { identity });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    console.log("✅ Generated token for:", identity, "room:", roomName);

    res.json({ token, roomName }); // ✅ send roomName to frontend
  } catch (err) {
    console.error("❌ Token error:", err);
    res.status(500).json({ error: "Token generation failed" });
  }
});

// ===== TOKEN ENDPOINT (POST — used by arpit_frontend) =====
app.post("/token", async (req, res) => {
  try {
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
    console.log("Generated token for:", identity, "room:", roomName);

    // Auto-dispatch agent to the same room
    try {
      await agentDispatch.createDispatch(roomName, "voice-bot");
      console.log("Agent dispatched to room:", roomName);
    } catch (e) {
      console.warn("Agent dispatch failed (agent not running?):", e.message);
    }

    res.json({ token, roomName });
  } catch (err) {
    console.error("Token error:", err);
    res.status(500).json({ error: "Token generation failed" });
  }
});

// ===== DISPATCH ENDPOINT =====
app.post("/start-agent", async (req, res) => {
  try {
    const { roomName } = req.body; // ✅ use room from frontend
    console.log("📡 Dispatching agent to room:", roomName);

    await agentDispatch.createDispatch(roomName, "voice-bot");

    console.log("🚀 Agent dispatch sent");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Dispatch error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.send("Server is running");
});

// ===== START SERVER =====
app.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});