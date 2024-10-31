const express = require("express");
const { ElevenLabsClient } = require("elevenlabs");
const { createWriteStream, unlink, createReadStream } = require("fs");
const { v4: uuid } = require("uuid");
const path = require("path");

const app = express();
const PORT = 3000;

// Directly set the API key here
const ELEVENLABS_API_KEY = "sk_c68443d5e9d5c33712245a1f23998fc2f11a5ffd239e226e";

if (!ELEVENLABS_API_KEY) {
  console.error("Error: ELEVENLABS_API_KEY is not set.");
  process.exit(1); // Exit if no API key is provided
}

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

// Serve the HTML file at the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Function to create an audio file from text and return the file path
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
      fileStream.on("finish", () => resolve(filePath));
      fileStream.on("error", (streamError) => {
        console.error("File stream error:", streamError);
        reject(new Error("Error writing audio file."));
      });
    } catch (error) {
      console.error("Error generating audio:", error);
      reject(new Error("Error generating audio. Please try again later."));
    }
  });
};

// Endpoint to generate audio and directly send it to the client
app.get("/textspeech", async (req, res) => {
  const text = req.query.prompt || req.query.query;
  if (!text) {
    return res.status(400).json({ error: "Missing 'prompt' or 'query' parameter" });
  }

  try {
    const filePath = await createAudioFileFromText(text);

    // Stream the audio file directly to the response
    res.setHeader("Content-Type", "audio/mpeg");
    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);

    // Delete the file after streaming is completed
    fileStream.on("close", () => {
      unlink(filePath, (err) => {
        if (err) console.error("Failed to delete audio file:", err);
      });
    });

    // Error handling for the stream
    fileStream.on("error", (streamError) => {
      console.error("Stream error:", streamError);
      res.status(500).json({ error: "Error streaming audio file." });
    });
  } catch (error) {
    console.error("Failed to generate audio:", error);
    res.status(500).json({ error: "Failed to generate audio", details: error.message });
  }
});

// Serve static files (like the HTML) from the "public" directory
app.use(express.static("public"));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
