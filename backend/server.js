// File: backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Multer to save uploads in /uploads
const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (_, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.use(cors());
app.use('/shorts', express.static(path.join(__dirname, 'shorts')));

// Health check
app.get('/', (req, res) => {
  res.send('🎬 Video Splitter Backend is up and running!');
});

// POST /upload → split into 60s chunks
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const inputPath = req.file.path;
  const outDir = path.join(__dirname, 'shorts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  ffmpeg.ffprobe(inputPath, (err, metadata) => {
    if (err) return res.status(500).json({ error: 'Error reading video.' });

    const totalSec = metadata.format.duration;
    const chunkSec = parseInt(process.env.CHUNK_SECONDS) || 60;
    const count = Math.ceil(totalSec / chunkSec);
    const urls = [];
    let completed = 0;

    for (let i = 0; i < count; i++) {
      const start = i * chunkSec;
      const name = `short-${i+1}-${Date.now()}.mp4`;
      const outPath = path.join(outDir, name);

      ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(chunkSec)
        .output(outPath)
        .on('end', () => {
          urls.push(`${req.protocol}://${req.get('host')}/shorts/${name}`);
          completed++;
          if (completed === count) {
            fs.unlinkSync(inputPath);
            res.json({ shorts: urls });
          }
        })
        .on('error', (e) => console.error('FFmpeg chunk error:', e))
        .run();
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
