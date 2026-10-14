const axios = require('axios');

const getLanguageById = (lang) => {
    if (!lang) return 63; // Default to JavaScript
    const language = {
        "c++": 54,
        "cpp": 54,
        "java": 62,
        "javascript": 63,
        "js": 63
    };

    return language[lang.toLowerCase()] || 63;
};

const getJudge0Config = () => {
    // If JUDGE0_URL is set, use self-hosted Judge0 (default: http://localhost:2358)
    const isSelfHosted = Boolean(process.env.JUDGE0_URL) || !process.env.JUDGE0_KEY;
    const baseUrl = process.env.JUDGE0_URL || (isSelfHosted ? 'http://localhost:2358' : 'https://judge0-ce.p.rapidapi.com');
    
    const headers = {
        'Content-Type': 'application/json'
    };

    if (!isSelfHosted && process.env.JUDGE0_KEY) {
        headers['x-rapidapi-key'] = process.env.JUDGE0_KEY;
        headers['x-rapidapi-host'] = 'judge0-ce.p.rapidapi.com';
    }

    return { baseUrl, headers };
};

const submitBatch = async (submissions) => {
    const { baseUrl, headers } = getJudge0Config();
    const options = {
        method: 'POST',
        url: `${baseUrl}/submissions/batch`,
        params: {
            base64_encoded: 'false'
        },
        headers,
        data: {
            submissions
        }
    };

    try {
        const response = await axios.request(options);
        return response.data;
    } catch (error) {
        console.error('Judge0 submitBatch error:', error.response?.data || error.message);
        throw new Error('Judge0 batch submission failed: ' + (error.response?.data?.message || error.message));
    }
};

const waiting = (timer) => new Promise((resolve) => setTimeout(resolve, timer));

const submitToken = async (resultToken) => {
    if (!resultToken || !Array.isArray(resultToken) || resultToken.length === 0) {
        throw new Error("No tokens provided to poll from Judge0");
    }

    const { baseUrl, headers } = getJudge0Config();
    const options = {
        method: 'GET',
        url: `${baseUrl}/submissions/batch`,
        params: {
            tokens: resultToken.join(","),
            base64_encoded: 'false',
            fields: '*'
        },
        headers
    };

    // Maximum 25 attempts * 1 second = 25 seconds timeout
    let maxAttempts = 25;
    while (maxAttempts > 0) {
        try {
            const response = await axios.request(options);
            const result = response.data;

            if (result && Array.isArray(result.submissions)) {
                // Check if all submissions have finished processing (status_id > 2)
                // status_id: 1 = In Queue, 2 = Processing, >= 3 = Finished
                const isResultObtained = result.submissions.every((r) => r.status_id > 2);
                if (isResultObtained) {
                    return result.submissions;
                }
            }
        } catch (error) {
            console.error('Judge0 submitToken error:', error.response?.data || error.message);
        }

        maxAttempts--;
        await waiting(1000);
    }

    throw new Error("Judge0 submission timed out after waiting for results");
};

module.exports = { getLanguageById, submitBatch, submitToken };
