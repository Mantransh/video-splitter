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

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const SHORTS_DIR = path.join(__dirname, 'shorts');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(SHORTS_DIR)) fs.mkdirSync(SHORTS_DIR);

// Configure Multer for 80MB max file size
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 80 * 1024 * 1024 } });

app.use(cors({
  origin: ['http://localhost:5173', 'https://your-frontend.vercel.app'],
}));
app.use(express.json());
app.use('/shorts', express.static(SHORTS_DIR));

// Health check route
app.get('/', (req, res) => {
  res.send('🎬 Video Splitter Backend is up and running!');
});

// Upload and split video
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const inputPath = req.file.path;

  // 🔥 Clear all existing shorts before creating new ones
  fs.readdir(SHORTS_DIR, (err, files) => {
    if (!err) {
      files.forEach(file => {
        fs.unlink(path.join(SHORTS_DIR, file), () => {});
      });
    }
  });

  // Duration from request (default: 45 seconds)
  let chunkSec = parseInt(req.body.duration, 10);
  if (isNaN(chunkSec) || chunkSec <= 0 || chunkSec > 60) {
    chunkSec = 45;
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
      const outPath = path.join(SHORTS_DIR, name);

      ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(chunkSec)
        .output(outPath)
        .on('end', () => {
          urls.push(`${req.protocol}://${req.get('host')}/shorts/${name}`);
          completed++;
          if (completed === count) {
            try {
              fs.unlinkSync(inputPath); // delete uploaded file
            } catch (unlinkErr) {
              console.error('Failed to delete uploaded file:', unlinkErr);
            }
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
