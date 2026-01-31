require('dotenv').config();
const axios = require('axios');

async function testGemini() {
    console.log("Testing a specific model...");
    const apiKey = process.env.OPENAI_API_KEY;

    // Test the chosen model
    const model = 'gemini-flash-latest';

    console.log(`\nAttempting with model: ${model}...`);
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: "Hello, this is a test. Are you working?" }] }]
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        console.log(`SUCCESS with ${model}!`);
        console.log("Response:", response.data.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (err) {
        console.error(`FAILED with ${model}`);
        console.error("Status:", err.response?.status);
        if (err.response?.data) {
            console.error("Full Error Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("Error Message:", err.message);
        }
    }
}

testGemini();
