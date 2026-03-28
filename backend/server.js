const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

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

// ✅ Multer setup (file storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max (important for Railway)
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
    const outputFiles = [];

    console.log("📥 File received:", inputPath);

    // 🔥 PROCESS IN BACKGROUND (IMPORTANT FOR FREE TIER)
    setImmediate(() => {
      processVideo(inputPath, duration, outputFiles);
    });

    // ✅ Respond immediately (prevents timeout & SIGKILL)
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
// 🚀 VIDEO PROCESSING FUNCTION
// ============================
function processVideo(inputPath, duration, outputFiles) {
  let index = 0;

  const processNext = () => {
    const outputPath = path.join(
      __dirname,
      "shorts",
      `short-${Date.now()}-${index}.mp4`
    );

    console.log("🎬 Processing chunk:", index);

    ffmpeg(inputPath)
      .setStartTime(index * duration)
      .setDuration(duration)

      // ✅ LIGHTWEIGHT TRANSFORMATION (IMPORTANT)
      .videoFilters([
        "scale=720:1280:force_original_aspect_ratio=decrease",
        "pad=720:1280:(ow-iw)/2:(oh-ih)/2:black"
      ])

      .videoCodec("libx264")
      .audioCodec("aac")

      .outputOptions([
        "-preset ultrafast",  // ⚡ reduces CPU usage
        "-crf 28"             // ⚡ reduces load
      ])

      .on("end", () => {
        console.log("✅ Chunk done:", index);

        outputFiles.push(`/shorts/${path.basename(outputPath)}`);
        index++;

        // Stop after 3 clips (prevents overload)
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
app.use("/shorts", express.static(path.join(__dirname, "shorts")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================
// 🚀 START SERVER
// ============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});