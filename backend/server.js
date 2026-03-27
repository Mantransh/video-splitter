require('dotenv').config();

const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// 📁 Directories
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const SHORTS_DIR = path.join(__dirname, 'shorts');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(SHORTS_DIR)) fs.mkdirSync(SHORTS_DIR);

// 📦 Multer setup
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 80 * 1024 * 1024 }, // 80MB
});

// 🌐 FORCE CORS FIX (important)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Handle preflight


app.use(express.json());
app.use('/shorts', express.static(SHORTS_DIR));

// 🏠 Health route
app.get('/', (_, res) => {
  res.send('🎬 Video Splitter Backend Running');
});

// 🎬 Upload & Split
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = req.file.path;

    let chunkSec = parseInt(req.body.duration, 10);
    if (isNaN(chunkSec) || chunkSec <= 0 || chunkSec > 60) {
      chunkSec = 45;
    }

    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return res.status(500).json({ error: 'Metadata error' });
      }

      const totalSec = metadata.format.duration;
      const count = Math.ceil(totalSec / chunkSec);

      const urls = [];

      let i = 0;

      const processNext = () => {
        if (i >= count) {
          return res.json({ shorts: urls });
        }

        const start = i * chunkSec;
        const fileName = `short-${Date.now()}-${i}.mp4`;
        const outputPath = path.join(SHORTS_DIR, fileName);

        ffmpeg(inputPath)
          .setStartTime(start)
          .setDuration(chunkSec)
          .output(outputPath)
          .on('end', () => {
            urls.push(`${req.protocol}://${req.get('host')}/shorts/${fileName}`);
            i++;
            processNext(); // 🔥 sequential processing
          })
          .on('error', (err) => {
            console.error(err);
            return res.status(500).json({ error: 'Processing failed' });
          })
          .run();
      };

      processNext(); // start
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});