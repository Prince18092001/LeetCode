const { getLanguageById, submitBatch, submitToken } = require("../utils/problemUtility");
const Problem = require("../models/problem");
const User = require("../models/user");
const Submission = require("../models/submission");
const SolutionVideo = require("../models/solutionVideo");
const cloudinary = require('cloudinary').v2;

const createProblem = async (req, res) => {
    const {
        title, description, difficulty, tags,
        visibleTestCases, hiddenTestCases, startCode,
        referenceSolution
    } = req.body;

    try {
        if (!title || !description || !difficulty || !tags) {
            return res.status(400).json({ message: "Missing required problem fields" });
        }

        if (!visibleTestCases || visibleTestCases.length === 0) {
            return res.status(400).json({ message: "At least one visible test case is required" });
        }

        // Test each reference solution against visible test cases using Judge0
        for (const { language, completeCode } of referenceSolution) {
            const languageId = getLanguageById(language);

            const submissions = visibleTestCases.map((testcase) => ({
                source_code: completeCode,
                language_id: languageId,
                stdin: testcase.input,
                expected_output: testcase.output
            }));

            const submitResult = await submitBatch(submissions);
            if (!submitResult || !Array.isArray(submitResult)) {
                return res.status(400).json({ message: "Judge0 did not return valid submission tokens" });
            }

            const resultToken = submitResult.map((value) => value.token);
            const testResult = await submitToken(resultToken);

            for (const test of testResult) {
                if (test.status_id !== 3) {
                    return res.status(400).json({
                        message: `Reference solution for ${language} failed test cases: status_id ${test.status_id}`
                    });
                }
            }
        }

        // Save in DB
        const userProblem = await Problem.create({
            ...req.body,
            problemCreator: req.result._id
        });

        res.status(201).json({
            message: "Problem created and verified successfully",
            problem: userProblem
        });
    } catch (err) {
        console.error("createProblem error:", err);
        res.status(400).json({ message: err.message || "Failed to create problem" });
    }
};

const updateProblem = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id) {
            return res.status(400).json({ message: "Missing problem ID" });
        }

        const problem = await Problem.findById(id);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        const newProblem = await Problem.findByIdAndUpdate(
            id,
            { ...req.body },
            { runValidators: true, new: true }
        );

        res.status(200).json({
            message: "Problem updated successfully",
            problem: newProblem
        });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to update problem" });
    }
};

const deleteProblem = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id) {
            return res.status(400).json({ message: "Problem ID is required" });
        }

        const deletedProblem = await Problem.findByIdAndDelete(id);
        if (!deletedProblem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        // Clean up associated video if exists
        const video = await SolutionVideo.findOneAndDelete({ problemId: id });
        if (video && video.cloudinaryPublicId) {
            try {
                await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: 'video', invalidate: true });
            } catch (cErr) {
                console.error("Error deleting video from Cloudinary:", cErr);
            }
        }

        // Also clean up submissions for this problem
        await Submission.deleteMany({ problemId: id });

        res.status(200).json({ message: "Problem and associated assets deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to delete problem" });
    }
};

const getProblemById = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id) {
            return res.status(400).json({ message: "Problem ID is required" });
        }

        const getProblem = await Problem.findById(id).select(
            '_id title description difficulty tags visibleTestCases startCode referenceSolution'
        );

        if (!getProblem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        const video = await SolutionVideo.findOne({ problemId: id });

        if (video) {
            const responseData = {
                ...getProblem.toObject(),
                secureUrl: video.secureUrl,
                thumbnailUrl: video.thumbnailUrl,
                duration: video.duration,
            };
            return res.status(200).json(responseData);
        }

        res.status(200).json(getProblem);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to fetch problem" });
    }
};

const getAllProblem = async (req, res) => {
    try {
        const problems = await Problem.find({}).select('_id title difficulty tags');
        // Return 200 with empty array if no problems exist, never 404
        res.status(200).json(problems || []);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to fetch problems" });
    }
};

const solvedAllProblembyUser = async (req, res) => {
    try {
        const userId = req.result._id;

        const user = await User.findById(userId).populate({
            path: "problemSolved",
            select: "_id title difficulty tags"
        });

        res.status(200).json(user?.problemSolved || []);
    } catch (err) {
        res.status(500).json({ message: err.message || "Server Error" });
    }
};

const submittedProblem = async (req, res) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.pid;

        const submissions = await Submission.find({ userId, problemId }).sort({ createdAt: -1 });
        return res.status(200).json(submissions || []);
    } catch (err) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = {
    createProblem,
    updateProblem,
    deleteProblem,
    getProblemById,
    getAllProblem,
    solvedAllProblembyUser,
    submittedProblem
};
