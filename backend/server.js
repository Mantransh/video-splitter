const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS — allow your Vercel frontend (set FRONTEND_URL in Railway env vars)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL, // e.g. https://video-splitter.vercel.app
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
  })
);

app.use(express.json());

// ─── Folders ─────────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "uploads");
const outputDir = path.join(__dirname, "shorts");

[uploadDir, outputDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── In-memory job store ──────────────────────────────────────────────────────
// { [jobId]: { status: "processing"|"done"|"error", shorts: [...urls], error } }
const jobs = {};

// ─── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed"));
    }
    cb(null, true);
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/", (req, res) => res.send("🎬 video-splitter backend running"));

// Upload → kick off processing → return jobId immediately
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const inputPath = req.file.path;
  const duration = Math.min(parseInt(req.body.duration) || 30, 120); // cap at 2 min
  const jobId = uuidv4();

  jobs[jobId] = { status: "processing", shorts: [] };

  console.log(`📥 Job ${jobId} — file: ${inputPath}, duration: ${duration}s`);

  // Fire-and-forget; response goes back immediately with the jobId
  processVideo(inputPath, duration, jobId);

  res.json({ jobId, status: "processing" });
});

// Poll this with the jobId the upload returned
app.get("/status/:jobId", (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

// ─── Video processing ─────────────────────────────────────────────────────────
function processVideo(inputPath, clipDuration, jobId) {
  const NUM_CLIPS = 3;
  let index = 0;

  const run = () => {
    const filename = `short-${jobId}-${index}.mp4`;
    const outputPath = path.join(outputDir, filename);

    console.log(`🎬 [${jobId}] clip ${index + 1}/${NUM_CLIPS}`);

    ffmpeg(inputPath)
      .setStartTime(index * clipDuration)
      .setDuration(clipDuration)
      // ✅ 9:16 crop: scale so smallest dimension fills 720×1280, then crop center
      .videoFilters([
        "scale=720:1280:force_original_aspect_ratio=increase",
        "crop=720:1280",
      ])
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-preset ultrafast", "-crf 28", "-movflags +faststart"])
      .on("end", () => {
        console.log(`✅ [${jobId}] clip ${index + 1} done`);
        jobs[jobId].shorts.push(`/shorts/${filename}`);
        index++;

        if (index < NUM_CLIPS) {
          run();
        } else {
          console.log(`🎉 [${jobId}] all clips done`);
          jobs[jobId].status = "done";
          setTimeout(() => {
              jobs[jobId]?.shorts?.forEach((url) => {
                const filePath = path.join(outputDir, path.basename(url));
                fs.unlink(filePath, () => {});
              });
              delete jobs[jobId];
            }, 30 * 60 * 1000); // clean up after 30 mins
          // Clean up uploaded source file to save disk space
          fs.unlink(inputPath, () => {});
        }
      })
      .on("error", (err) => {
        console.error(`❌ [${jobId}] FFmpeg error:`, err.message);
        jobs[jobId].status = "error";
        jobs[jobId].error = err.message;
        fs.unlink(inputPath, () => {});
      })
      .save(outputPath);
  };

  run();
}

// ─── Static ───────────────────────────────────────────────────────────────────
app.use("/shorts", express.static(outputDir));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));