import "dotenv/config.js";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const GEMINI_MODEL = "gemini-2.5-flash";

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "public"))); // setup for FE

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost: ${PORT}`);
});

app.post("/api/chat", async (req, res) => {
  const { conversation } = req.body;
  try {
    if (!Array.isArray(conversation))
      throw new Error("Message must be an array");

    const contents = conversation.map(({ role, text }) => ({
      role,
      parts: [{ text }],
    }));
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.9,
        systemInstruction:
          "Anda adalah asisten belajar bahasa inggris, koreksi kata atau kalimat saya",
      },
    });
    res.status(200).json({ result: response.text });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
