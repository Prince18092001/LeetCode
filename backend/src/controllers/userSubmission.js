const Problem = require("../models/problem");
const Submission = require("../models/submission");
const User = require("../models/user");
const { getLanguageById, submitBatch, submitToken } = require("../utils/problemUtility");

const submitCode = async (req, res) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.id;

        let { code, language } = req.body;

        if (!userId || !code || !problemId || !language) {
            return res.status(400).json({ message: "Some fields are missing" });
        }

        if (language === 'cpp') language = 'c++';

        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        if (!problem.hiddenTestCases || problem.hiddenTestCases.length === 0) {
            return res.status(400).json({ message: "No hidden test cases found for this problem" });
        }

        // Create pending submission in DB
        const submittedResult = await Submission.create({
            userId,
            problemId,
            code,
            language,
            status: 'pending',
            testCasesTotal: problem.hiddenTestCases.length
        });

        const languageId = getLanguageById(language);

        const submissions = problem.hiddenTestCases.map((testcase) => ({
            source_code: code,
            language_id: languageId,
            stdin: testcase.input,
            expected_output: testcase.output
        }));

        const submitResult = await submitBatch(submissions);
        if (!submitResult || !Array.isArray(submitResult)) {
            throw new Error("Invalid response received from Judge0");
        }

        const resultToken = submitResult.map((value) => value.token);
        const testResult = await submitToken(resultToken);

        let testCasesPassed = 0;
        let runtime = 0;
        let memory = 0;
        let status = 'accepted';
        let errorMessage = null;

        for (const test of testResult) {
            if (test.status_id === 3) {
                testCasesPassed++;
                runtime += parseFloat(test.time || 0);
                memory = Math.max(memory, test.memory || 0);
            } else {
                if (test.status_id === 4) {
                    status = 'wrong';
                    errorMessage = test.compile_output || test.stderr || "Wrong Answer";
                } else {
                    status = 'error';
                    errorMessage = test.compile_output || test.stderr || test.message || "Runtime Error";
                }
            }
        }

        // Update submission in DB
        submittedResult.status = status;
        submittedResult.testCasesPassed = testCasesPassed;
        submittedResult.errorMessage = errorMessage;
        submittedResult.runtime = parseFloat(runtime.toFixed(3));
        submittedResult.memory = memory;
        await submittedResult.save();

        const accepted = (status === 'accepted');

        // Only add problem to problemSolved if accepted!
        if (accepted) {
            const alreadySolved = req.result.problemSolved.some(
                (pId) => pId.toString() === problemId.toString()
            );

            if (!alreadySolved) {
                req.result.problemSolved.push(problemId);
                await req.result.save();
            }
        }

        res.status(200).json({
            accepted,
            status,
            totalTestCases: submittedResult.testCasesTotal,
            passedTestCases: testCasesPassed,
            runtime: submittedResult.runtime,
            memory: submittedResult.memory,
            error: errorMessage
        });
    } catch (err) {
        console.error("submitCode error:", err);
        res.status(500).json({ message: "Submission failed: " + err.message });
    }
};

const runCode = async (req, res) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.id;

        let { code, language } = req.body;

        if (!userId || !code || !problemId || !language) {
            return res.status(400).json({ message: "Some fields are missing" });
        }

        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        if (!problem.visibleTestCases || problem.visibleTestCases.length === 0) {
            return res.status(400).json({ message: "No visible test cases found for this problem" });
        }

        if (language === 'cpp') language = 'c++';

        const languageId = getLanguageById(language);

        const submissions = problem.visibleTestCases.map((testcase) => ({
            source_code: code,
            language_id: languageId,
            stdin: testcase.input,
            expected_output: testcase.output
        }));

        const submitResult = await submitBatch(submissions);
        if (!submitResult || !Array.isArray(submitResult)) {
            throw new Error("Invalid response received from Judge0");
        }

        const resultToken = submitResult.map((value) => value.token);
        const testResult = await submitToken(resultToken);

        let testCasesPassed = 0;
        let runtime = 0;
        let memory = 0;
        let status = true;

        for (const test of testResult) {
            if (test.status_id === 3) {
                testCasesPassed++;
                runtime += parseFloat(test.time || 0);
                memory = Math.max(memory, test.memory || 0);
            } else {
                status = false;
            }
        }

        res.status(200).json({
            success: status,
            testCases: testResult,
            passedTestCases: testCasesPassed,
            totalTestCases: problem.visibleTestCases.length,
            runtime: parseFloat(runtime.toFixed(3)),
            memory
        });
    } catch (err) {
        console.error("runCode error:", err);
        res.status(500).json({ message: "Run failed: " + err.message });
    }
};

module.exports = { submitCode, runCode };