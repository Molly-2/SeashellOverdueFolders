const express = require("express");
const { ElevenLabsClient } = require("elevenlabs");
const { createWriteStream } = require("fs");
const { v4: uuid } = require("uuid");
const path = require("path");

const app = express();
const PORT = 3000;

// Replace with your Eleven Labs API key
const ELEVENLABS_API_KEY = "sk_c68443d5e9d5c33712245a1f23998fc2f11a5ffd239e226e";

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

// Serve the HTML file at the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Function to create an audio file from text
const createAudioFileFromText = async (text) => {
  return new Promise(async (resolve, reject) => {
    try {
      const audio = await client.generate({
        voice: "Rachel",
        model_id: "eleven_turbo_v2_5",
        text,
      });
      const fileName = `${uuid()}.mp3`;
      const filePath = path.join(__dirname, "public", fileName);
      const fileStream = createWriteStream(filePath);

      audio.pipe(fileStream);
      fileStream.on("finish", () => resolve(fileName));
      fileStream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
};

// Endpoint to generate audio and return its URL
app.get("/textspeech", async (req, res) => {
  const text = req.query.prompt || req.query.query;
  if (!text) {
    return res.status(400).json({ error: "Missing 'prompt' or 'query' parameter" });
  }

  try {
    const fileName = await createAudioFileFromText(text);
    const audioUrl = `${req.protocol}://${req.get("host")}/${fileName}`;
    res.json({ message: "Audio file created", audioUrl });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate audio", details: error.message });
  }
});

// Serve audio files and other static files from the "public" directory
app.use(express.static("public"));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
