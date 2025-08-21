// server.js

// Import necessary packages
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Load environment variables from .env file

// --- Server and API Setup ---
const app = express();
const PORT = process.env.PORT;

// Use multer for handling file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// Serve static files from the project root directory
app.use(express.static('.'));
app.use(express.json()); // Middleware to parse JSON bodies

// Initialize the Gemini AI Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not defined in the .env file.");
    process.exit(1); // Stop the server if the key is missing
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});


// --- In-memory storage for the PDF text ---
// Note: For a production app, you'd use a database or more robust session management.
let documentText = "";

// --- API Endpoints ---

/**
 * Endpoint to upload a PDF.
 * It extracts text from the PDF and stores it in the `documentText` variable.
 */
app.post('/api/upload', upload.single('pdfFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        // Use pdf-parse to extract text from the uploaded file buffer
        const data = await pdf(req.file.buffer);
        documentText = data.text; // Store the extracted text
        
        console.log('File processed successfully. Character count:', documentText.length);
        
        res.json({ 
            message: 'File uploaded and processed successfully.',
            fileName: req.file.originalname 
        });

    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ error: 'Failed to process PDF file.' });
    }
});


/**
 * Endpoint to handle chat queries.
 * It uses the stored document text to answer questions via the Gemini API.
 */
app.post('/api/chat', async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: 'Question is required.' });
    }

    if (!documentText) {
        return res.status(400).json({ error: 'No document has been processed. Please upload a PDF first.' });
    }

    try {
        const prompt = `
            Based on the content of the document provided below adn your own extended research, answer the user's question.
            Your response should be based strictly on the information area within the text.
            If the answer cannot be found in the document, you must state: "The answer to this question is not found in the document but this is from my own understanding", then try to answer the question by staying in relation to the subject matter
           .

            --- Document Content ---
            ${documentText}
            --- End Document Content ---

            User's Question: "${question}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text();

        res.json({ answer: answer });

    } catch (error) {
        console.error('Error querying Gemini API:', error);
        res.status(500).json({ error: 'An error occurred while communicating with the AI.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});