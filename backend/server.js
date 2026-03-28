const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

// ✅ Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Folders
const uploadDir = path.join(__dirname, "uploads");
const outputDir = path.join(__dirname, "shorts");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Health check
app.get("/", (req, res) => {
  res.send("🎬 Backend Running");
});

// Upload
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  const inputPath = req.file.path;
  const duration = parseInt(req.body.duration) || 30;

  console.log("📥 Uploaded:", inputPath);

  processVideo(inputPath, duration);

  res.json({
    status: "processing",
    message: "Processing started",
  });
});

// Fetch processed videos
app.get("/shorts-list", (req, res) => {
  const files = fs.readdirSync(outputDir);

  const urls = files.map(file => `/shorts/${file}`);

  res.json({ shorts: urls });
});

// Video processing
function processVideo(inputPath, duration) {
  let index = 0;

  const run = () => {
    const outputPath = path.join(
      outputDir,
      `short-${Date.now()}-${index}.mp4`
    );

    console.log("🎬 Processing:", index);

    ffmpeg(inputPath)
      .setStartTime(index * duration)
      .setDuration(duration)
      .videoFilters([
        "scale=720:1280:force_original_aspect_ratio=increase",
        "crop=720:1280"
      ])
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-preset ultrafast", "-crf 28"])
      .on("end", () => {
        console.log("✅ Done:", index);

        index++;

        if (index < 3) run();
        else console.log("🎉 Processing complete");
      })
      .on("error", err => console.error("❌ FFmpeg:", err))
      .save(outputPath);
  };

  run();
}

// Static files
app.use("/shorts", express.static(outputDir));
app.use("/uploads", express.static(uploadDir));

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});