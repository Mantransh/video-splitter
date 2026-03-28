const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// ✅ FIRST: import ffmpeg & path
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

// ✅ THEN: set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// ✅ Use Railway port
const PORT = process.env.PORT || 5000;

// ✅ Middlewares
app.use(cors());
app.use(express.json());

// ✅ Ensure folders exist
const uploadDir = path.join(__dirname, "uploads");
const outputDir = path.join(__dirname, "shorts");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// ============================
// 🚀 MULTER SETUP
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

// ============================
// 🚀 HEALTH CHECK
// ============================
app.get("/", (req, res) => {
  res.send("🎬 Video Splitter Backend Running");
});

// ============================
// 🚀 UPLOAD ROUTE
// ============================
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const duration = parseInt(req.body.duration) || 30;
    const inputPath = req.file.path;

    console.log("📥 File received:", inputPath);

    // ✅ background processing
    setImmediate(() => {
      processVideo(inputPath, duration);
    });

    return res.json({
      message: "Processing started",
      status: "processing",
    });

  } catch (err) {
    console.error("❌ Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

// ============================
// 🚀 VIDEO PROCESSING
// ============================
function processVideo(inputPath, duration) {
  let index = 0;

  const processNext = () => {
    const outputPath = path.join(
      outputDir,
      `short-${Date.now()}-${index}.mp4`
    );

    console.log("🎬 Processing chunk:", index);

    ffmpeg(inputPath)
      .setStartTime(index * duration)
      .setDuration(duration)

      // ✅ LIGHTWEIGHT + SAFE 9:16
      .videoFilters([
        "scale=720:1280:force_original_aspect_ratio=increase",
        "crop=720:1280",
      ])

      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-preset ultrafast",
        "-crf 28"
      ])

      .on("end", () => {
        console.log("✅ Chunk done:", index);

        index++;

        if (index < 3) {
          processNext();
        } else {
          console.log("🎉 Processing complete");
        }
      })

      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err);
      })

      .save(outputPath);
  };

  processNext();
}

// ============================
// 🚀 STATIC FILES
// ============================
app.use("/shorts", express.static(outputDir));
app.use("/uploads", express.static(uploadDir));

// ============================
// 🚀 START SERVER
// ============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});