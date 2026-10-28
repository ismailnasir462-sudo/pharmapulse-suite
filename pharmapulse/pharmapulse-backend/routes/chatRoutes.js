const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/chat/session - Create a new chat session
router.post('/session', authenticateToken, async (req, res) => {
    try {
        const { title } = req.body;
        const [result] = await db.execute(
            `INSERT INTO chat_sessions (user_id, session_title) VALUES (?, ?)`,
            [req.user.user_id, title || 'New Consultation']
        );
        res.json({ success: true, sessionId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/chat/message - Send prompt to AI with MySQL RAG context
router.post('/message', authenticateToken, async (req, res) => {
    try {
        const { sessionId, message } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({ error: 'sessionId and message are required' });
        }

        // 1. Fetch relevant clinical context from MySQL
        const [clinicalFacts] = await db.execute(
            `SELECT generic_name, therapeutic_class, standard_dosage, contraindications, side_effects, source_reference 
             FROM clinical_knowledge_base 
             WHERE generic_name LIKE ? OR therapeutic_class LIKE ? LIMIT 3`,
            [`%${message}%`, `%${message}%`]
        );

        const contextJSON = clinicalFacts.length > 0 ? JSON.stringify(clinicalFacts) : "No direct local database record found.";

        // 2. Call Gemini Model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
        You are PharmaPulse AI, a clinical pharmacy decision-support assistant.
        
        Verified Database Context (MoH Ghana / WHO / FDA Ghana):
        ${contextJSON}

        User Query: "${message}"

        Instructions:
        - Provide accurate dosage, therapeutic indication, or warning guidance.
        - Include explicit source citations if matching records are found in the context.
        `;

        const result = await model.generateContent(prompt);
        const botResponse = result.response.text();
        const citations = clinicalFacts.map(fact => fact.source_reference).filter(Boolean);

        // 3. Store conversation history
        await db.execute(
            `INSERT INTO chat_messages (session_id, sender_type, message_text) VALUES (?, 'USER', ?)`,
            [sessionId, message]
        );

        await db.execute(
            `INSERT INTO chat_messages (session_id, sender_type, message_text, retrieved_context, source_citations) 
             VALUES (?, 'BOT', ?, ?, ?)`,
            [sessionId, botResponse, JSON.stringify(clinicalFacts), JSON.stringify(citations)]
        );

        res.json({
            success: true,
            reply: botResponse,
            citations,
            contextUsed: clinicalFacts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;