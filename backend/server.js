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
app.options('*', (req, res) => {
  res.sendStatus(200);
});

app.use(express.json());
app.use('/shorts', express.static(SHORTS_DIR));

// 🏠 Health route
app.get('/', (_, res) => {
  res.send('🎬 Video Splitter Backend Running');
});

// 🎬 Upload & Split
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    res.setTimeout(0); // prevent timeout

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = req.file.path;

    let chunkSec = parseInt(req.body.duration, 10);
    if (isNaN(chunkSec) || chunkSec <= 0 || chunkSec > 60) {
      chunkSec = 45;
    }

    console.log('📂 Uploaded:', inputPath);

    ffmpeg.ffprobe(inputPath, async (err, metadata) => {
      if (err) {
        console.error('❌ FFprobe error:', err);
        return res.status(500).json({ error: 'Metadata read failed' });
      }

      const totalSec = metadata.format.duration;
      const count = Math.ceil(totalSec / chunkSec);

      console.log(`🎞 Duration: ${totalSec}s | Parts: ${count}`);

      const tasks = [];

      for (let i = 0; i < count; i++) {
        const start = i * chunkSec;
        const fileName = `short-${Date.now()}-${i}.mp4`;
        const outputPath = path.join(SHORTS_DIR, fileName);

        const task = new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .setStartTime(start)
            .setDuration(chunkSec)
            .output(outputPath)
            .on('end', () => {
              console.log(`✅ Created: ${fileName}`);
              resolve(`${req.protocol}://${req.get('host')}/shorts/${fileName}`);
            })
            .on('error', (err) => {
              console.error('❌ FFmpeg error:', err);
              reject(err);
            })
            .run();
        });

        tasks.push(task);
      }

      try {
        const urls = await Promise.all(tasks);

        // Cleanup uploaded file
        fs.unlink(inputPath, () => {});

        return res.json({ shorts: urls });
      } catch (err) {
        console.error('❌ Processing failed:', err);
        return res.status(500).json({ error: 'Video processing failed' });
      }
    });

  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});