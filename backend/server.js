// File: backend/server.js

require('dotenv').config();

const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Helper: Delete oldest files if shorts folder has more than maxFiles shorts
function cleanOldShortsFolder(folderPath, maxFiles = 50) {
  if (!fs.existsSync(folderPath)) return;

  const files = fs.readdirSync(folderPath)
    .map(file => ({
      name: file,
      time: fs.statSync(path.join(folderPath, file)).mtime.getTime()
    }))
    .sort((a, b) => a.time - b.time); // Oldest first

  if (files.length <= maxFiles) return; // Nothing to delete

  const filesToDelete = files.slice(0, files.length - maxFiles);
  for (const file of filesToDelete) {
    try {
      fs.unlinkSync(path.join(folderPath, file.name));
      console.log(`Deleted old short: ${file.name}`);
    } catch (err) {
      console.error(`Error deleting file ${file.name}:`, err);
    }
  }
}

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
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max size limit
});

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://video-splitter-zeta.vercel.app',
    'https://video-splitter-git-main-mantranshs-projects.vercel.app',
    'https://video-splitter-ix5dd5yfj-mantranshs-projects.vercel.app'
  ],
  credentials: true,
}));
app.use(express.json());
app.use('/shorts', express.static(path.join(__dirname, 'shorts')));

// Health check route
app.get('/', (req, res) => {
  res.send('🎬 Video Splitter Backend is up and running!');
});

// Test route for quick API check
app.get('/api/pong', (req, res) => {
  res.json({ pong: true });
});

// POST /upload → split uploaded video into multiple chunks of user-defined duration
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const inputPath = req.file.path;
  const outDir = path.join(__dirname, 'shorts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  // Read duration from request body (sent from frontend)
  // Default to 60 seconds if not provided or invalid
  let chunkSec = parseInt(req.body.duration, 10);
  if (isNaN(chunkSec) || chunkSec <= 0) {
    chunkSec = 60;
  }

  ffmpeg.ffprobe(inputPath, (err, metadata) => {
    if (err) {
      console.error('Error reading video metadata:', err);
      return res.status(500).json({ error: 'Error reading video metadata' });
    }

    const totalSec = metadata.format.duration;
    const count = Math.ceil(totalSec / chunkSec);
    const urls = [];
    let completed = 0;

    for (let i = 0; i < count; i++) {
      const start = i * chunkSec;
      const name = `short-${i + 1}-${Date.now()}.mp4`;
      const outPath = path.join(outDir, name);

      ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(chunkSec)
        .output(outPath)
        .on('end', () => {
          urls.push(`${req.protocol}://${req.get('host')}/shorts/${name}`);
          completed++;
          if (completed === count) {
            try {
              fs.unlinkSync(inputPath);
            } catch (unlinkErr) {
              console.error('Failed to delete uploaded file:', unlinkErr);
            }

            // Clean shorts folder after processing new shorts
            cleanOldShortsFolder(outDir, 50);

            res.json({ shorts: urls });
          }
        })
        .on('error', (e) => {
          console.error('FFmpeg processing error:', e);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Video processing failed' });
          }
        })
        .run();
    }
  });
});

app.listen(PORT, () => {
  console.log(` Backend running on http://localhost:${PORT}`);
});
