const { GoogleGenAI } = require("@google/genai");

const solveDoubt = async (req, res) => {
    const { messages, title, description, testCases, startCode } = req.body;
    let formattedContents = [];

    if (Array.isArray(messages)) {
        let startIdx = 0;
        while (startIdx < messages.length && messages[startIdx].role === 'model') {
            startIdx++;
        }

        formattedContents = messages.slice(startIdx).map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: Array.isArray(msg.parts) ? msg.parts : [{ text: String(msg.text || msg.content || "") }]
        }));
    }

    if (formattedContents.length === 0) {
        return res.status(400).json({
            message: "No user message provided to AI chatbot"
        });
    }

    try {
        if (!process.env.GEMINI_KEY) {
            throw new Error("API key not valid: GEMINI_KEY is missing in .env");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

        const systemInstruction = `
You are an expert Data Structures and Algorithms (DSA) tutor specializing in helping users solve coding problems. Your role is strictly limited to DSA-related assistance only.

## CURRENT PROBLEM CONTEXT:
[PROBLEM_TITLE]: ${title || "DSA Problem"}
[PROBLEM_DESCRIPTION]: ${description || "No description provided"}
[EXAMPLES]: ${typeof testCases === 'object' ? JSON.stringify(testCases, null, 2) : (testCases || "None")}
[startCode]: ${typeof startCode === 'object' ? JSON.stringify(startCode, null, 2) : (startCode || "None")}

## YOUR CAPABILITIES:
1. **Hint Provider**: Give step-by-step hints without revealing the complete solution immediately
2. **Code Reviewer**: Debug and fix code submissions with clear explanations
3. **Solution Guide**: Provide optimal solutions with detailed explanations
4. **Complexity Analyzer**: Explain time and space complexity trade-offs
5. **Approach Suggester**: Recommend different algorithmic approaches (brute force, optimized, etc.)
6. **Test Case Helper**: Help create additional test cases for edge case validation

## INTERACTION GUIDELINES:
- Provide clear, concise explanations and code snippets with proper syntax.
- Guide users to discover solutions and understand algorithmic trade-offs.
- Strictly focus on DSA and the current problem context.
`;

        let response;
        try {
            response = await ai.models.generateContent({
                model: "gemini-flash-lite-latest",
                contents: formattedContents,
                config: {
                    systemInstruction: systemInstruction
                }
            });
        } catch (mErr) {
            console.warn("Primary model fallback to gemini-3.8-flash:", mErr.message);
            response = await ai.models.generateContent({
                model: "gemini-3.8-flash",
                contents: formattedContents,
                config: {
                    systemInstruction: systemInstruction
                }
            });
        }

        const replyText = response.text || "I was unable to generate a response. Please try again.";

        res.status(200).json({
            message: replyText
        });
    } catch (err) {
        console.error("AI solveDoubt error:", err);
        const errMsg = err.message || "";
        if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
            const lastMsg = (formattedContents && formattedContents[formattedContents.length - 1]?.parts[0]?.text) || "";
            const lower = lastMsg.toLowerCase().trim();
            let fallbackReply = "Hello! I am your DSA AI Tutor for **" + (title || "this problem") + "**.\n\n";
            if (lower === "hi" || lower === "hello" || lower.startsWith("hey")) {
                fallbackReply += "How can I help you tackle this problem today? You can ask me for:\n- Step-by-step hints\n- Algorithmic approaches\n- Time and space complexity trade-offs";
            } else if (lower.includes("hint") || lower.includes("approach") || lower.includes("solve") || lower.includes("how")) {
                fallbackReply += "Here is a structured approach to think about:\n1. Carefully examine the input constraints and edge cases.\n2. Start with a brute-force approach to guarantee correctness.\n3. Optimize: Can a Hash Map, Two Pointers, or Binary Search reduce the time complexity?";
            } else {
                fallbackReply += "I received your question: \"" + lastMsg + "\". Please make sure your GEMINI_KEY is valid in backend/.env.";
            }
            return res.status(200).json({
                message: fallbackReply
            });
        }
        res.status(500).json({
            message: errMsg || "Internal server error occurred while contacting AI"
        });
    }
};

module.exports = solveDoubt;
