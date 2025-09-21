import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
 
const app = express();
const upload = multer();
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const GEMINI_MODEL = "gemini-2.5-flash";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// inisialisasi model AI
const geminiModels = {
    text: "gemini-2.5-flash-lite",
    image: "gemini-2.5-flash",
    audio: "gemini-2.5-flash",
    document: "gemini-2.5-flash-lite"
};
 
// inisialisasi aplikasi back-end/server
app.use(cors()); // .use() --> panggil/bikin middleware
// app.use(() => {}); --> pakai middleware sendiri
app.use(express.json()); // --> untuk membolehkan kita menggunakan 'Content-Type: application/json' di header

// == Tambahan middleware untuk serve file static
// Serve all static files in public solution (HTML, JS, CSS) at root path
app.use(express.static(path.join(__dirname, 'public')));

function extractText(resp) {
    try {
        const text =
            resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
            resp?.candidates?.[0]?.content?.parts?.[0]?.text ??
            resp?.response?.candidates?.[0]?.content?.text;

        if (!text) {
            console.error("No text found in response");
            return JSON.stringify(resp, null, 2);
        }

        // Clean up the text and ensure proper markdown formatting
        const cleanText = text
            .replace(/\\n\\n/g, '\n\n')  // Fix double newlines
            .trim();

        return cleanText;
    } catch (err) {
        console.error("Error extracting text:", err);
        return JSON.stringify(resp, null, 2);
    }
}

// inisialisasi route-nya
// .get(), .post(), .put(), .patch(), .delete() --> yang paling umum dipakai
// .options() --> lebih jarang dipakai, karena ini lebih ke preflight (untuk CORS umumnya)
 
// API Chat
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if(!Array.isArray(messages)) throw new Error("message must be an array");
        const contents = messages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));
        const resp = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents
        });
        res.json({ result: extractText(resp) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/generate-text', async (req, res) => {
    try {
        const { prompt } = req.body || {};    
        if (!prompt || typeof prompt !== 'string') {
            res.status(400).json({ prompt: "Prompt is missing or invalid format." });
            return; // keluar lebih awal dari handler
        }
        const response = await ai.models.generateContent({
            contents: prompt,
            // model: geminiModels.text
            model: GEMINI_MODEL
        });
        res.json({ result: extractText(response) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
 
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const imageBase64 = req.file.buffer.toString('base64');
        const resp = await ai.models.generateContent({
            // model: geminiModels.text
            model: GEMINI_MODEL,
            contents: [
                { text: prompt },
                { inlineData: { mimeType: req.file.mimetype, data: imageBase64 } }
            ]
        });
        res.json({ result: extractText(resp) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const docBase64 = req.file.buffer.toString('base64');
        const resp = await ai.models.generateContent({
            // model: geminiModels.text
            model: GEMINI_MODEL,
            contents: [
                { text: prompt || "Ringkas dokumen berikut:" },
                { inlineData: { mimeType: req.file.mimetype, data: docBase64}}
            ]
    });
    res.json({ result: extractText(resp) });
    } catch (err) {
    res.status(500).json({ error: err.message });
    }
});


app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    try {
        const { prompt } = req.body;
        const audioBase64 = req.file.buffer.toString('base64');
        const resp = await ai.models.generateContent({
            // model: geminiModels.text
            model: GEMINI_MODEL,
            contents: [
                { text: prompt || "Transkrip audio berikut:" },
                { inlineData: { mimeType: req.file.mimetype, data: audioBase64 } }
            ]
    });
    res.json({ result: extractText(resp) });
    } catch (err) {
    res.status(500).json({ error: err.message });
    }
});


// panggil si app-nya di sini
const port = process.env.PORT || 3000;
 
app.listen(port, () => {
    console.log("Gemini API server is running at http://localhost:",port);
});