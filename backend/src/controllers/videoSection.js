const cloudinary = require('cloudinary').v2;
const Problem = require("../models/problem");
const SolutionVideo = require("../models/solutionVideo");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const generateUploadSignature = async (req, res) => {
    try {
        const { problemId } = req.params;
        const userId = req.result._id;

        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        const timestamp = Math.round(new Date().getTime() / 1000);
        const publicId = `leetcode-solutions/${problemId}/${userId}_${timestamp}`;

        const uploadParams = {
            timestamp: timestamp,
            public_id: publicId,
        };

        const signature = cloudinary.utils.api_sign_request(
            uploadParams,
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            signature,
            timestamp,
            public_id: publicId,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            upload_url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
        });
    } catch (error) {
        console.error('Error generating upload signature:', error);
        res.status(500).json({ error: 'Failed to generate upload credentials' });
    }
};

const saveVideoMetadata = async (req, res) => {
    try {
        const {
            problemId,
            cloudinaryPublicId,
            secureUrl,
            duration,
        } = req.body;

        const userId = req.result._id;

        // Verify the upload with Cloudinary
        const cloudinaryResource = await cloudinary.api.resource(
            cloudinaryPublicId,
            { resource_type: 'video' }
        );

        if (!cloudinaryResource) {
            return res.status(400).json({ error: 'Video not found on Cloudinary' });
        }

        // Generate clean thumbnail image URL (not an <img> HTML tag)
        const thumbnailUrl = cloudinary.url(cloudinaryResource.public_id, {
            resource_type: 'video',
            format: 'jpg',
            transformation: [
                { width: 640, crop: 'scale' },
                { quality: 'auto' }
            ]
        });

        // Upsert video solution record (replace or create)
        let videoSolution = await SolutionVideo.findOne({ problemId });

        if (videoSolution) {
            // If already exists, delete old asset on Cloudinary if different
            if (videoSolution.cloudinaryPublicId !== cloudinaryPublicId) {
                try {
                    await cloudinary.uploader.destroy(videoSolution.cloudinaryPublicId, {
                        resource_type: 'video',
                        invalidate: true
                    });
                } catch (e) {
                    console.error("Old video cleanup error:", e);
                }
            }
            videoSolution.cloudinaryPublicId = cloudinaryPublicId;
            videoSolution.secureUrl = secureUrl;
            videoSolution.duration = cloudinaryResource.duration || duration || 0;
            videoSolution.thumbnailUrl = thumbnailUrl;
            videoSolution.userId = userId;
            await videoSolution.save();
        } else {
            videoSolution = await SolutionVideo.create({
                problemId,
                userId,
                cloudinaryPublicId,
                secureUrl,
                duration: cloudinaryResource.duration || duration || 0,
                thumbnailUrl
            });
        }

        res.status(201).json({
            message: 'Video solution saved successfully',
            videoSolution: {
                id: videoSolution._id,
                thumbnailUrl: videoSolution.thumbnailUrl,
                duration: videoSolution.duration,
                uploadedAt: videoSolution.createdAt
            }
        });
    } catch (error) {
        console.error('Error saving video metadata:', error);
        res.status(500).json({ error: 'Failed to save video metadata: ' + error.message });
    }
};

const deleteVideo = async (req, res) => {
    try {
        const { problemId } = req.params;

        const video = await SolutionVideo.findOneAndDelete({ problemId: problemId });
        if (!video) {
            return res.status(404).json({ error: 'Video not found for this problem' });
        }

        await cloudinary.uploader.destroy(video.cloudinaryPublicId, {
            resource_type: 'video',
            invalidate: true
        });

        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: 'Failed to delete video: ' + error.message });
    }
};

module.exports = { generateUploadSignature, saveVideoMetadata, deleteVideo };
