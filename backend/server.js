require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const app = express();
const PORT = process.env.PORT || 8080;

/* -----------------------------
   🔥 MIDDLEWARE
--------------------------------*/
app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -----------------------------
   📁 CREATE UPLOADS FOLDER
--------------------------------*/
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

/* -----------------------------
   📦 MULTER SETUP
--------------------------------*/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

/* -----------------------------
   🎬 FFmpeg PROCESSING (ZOOM OUT + BLACK BARS)
--------------------------------*/
function processVideo(input, output, start, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .inputOptions("-noautorotate")
      .setStartTime(start)
      .setDuration(duration)

      .videoFilters([
        // 🔥 Keep aspect ratio, fit inside 9:16
        "scale=1080:1920:force_original_aspect_ratio=decrease",

        // 🔥 Add black bars
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black",

        // 🔥 Fix aspect ratio issues
        "setsar=1"
      ])

      .videoCodec("libx264")
      .audioCodec("aac")

      .outputOptions([
        "-preset",
        "fast",
        "-crf",
        "23",
        "-movflags",
        "+faststart"
      ])

      .on("start", (cmd) => {
        console.log("FFmpeg CMD:", cmd);
      })

      .on("end", () => {
        console.log("Processing done:", output);
        resolve();
      })

      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        reject(err);
      })

      .save(output);
  });
}

/* -----------------------------
   🚀 UPLOAD + PROCESS ROUTE
--------------------------------*/
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const duration = parseInt(req.body.duration) || 45;

    const outputs = [];
    const tasks = [];

    // 🔥 Generate 3 clips
    for (let i = 0; i < 3; i++) {
      const outputPath = `uploads/output_${Date.now()}_${i}.mp4`;

      tasks.push(
        processVideo(filePath, outputPath, i * duration, duration)
      );

      outputs.push(outputPath);
    }

    await Promise.all(tasks);

    // 🔥 Generate URLs
    const urls = outputs.map(
      (file) =>
        `${req.protocol}://${req.get("host")}/uploads/${path.basename(file)}`
    );

    // 🔥 Delete original file
    fs.unlinkSync(filePath);

    res.json({ shorts: urls });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "Processing failed" });
  }
});

/* -----------------------------
   🟢 HEALTH CHECK
--------------------------------*/
app.get("/", (req, res) => {
  res.send("🚀 Backend running successfully");
});

/* -----------------------------
   🚀 START SERVER
--------------------------------*/
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});