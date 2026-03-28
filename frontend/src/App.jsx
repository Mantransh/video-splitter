import React, { useState, useRef, useCallback } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const MAX_FILE_MB = 100;
const POLL_INTERVAL_MS = 4000;

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [duration, setDuration] = useState(45);
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const pollRef = useRef(null); // store interval so we can cancel it

  // ── File validation ─────────────────────────────────────────────────────────
  const handleFileChange = (file) => {
    setError("");
    setShorts([]);

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file (mp4, mov, avi…)");
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File too large. Max size is ${MAX_FILE_MB} MB.`);
      return;
    }

    setVideoFile(file);
  };

  // ── Polling ─────────────────────────────────────────────────────────────────
  const startPolling = useCallback((jobId) => {
    // Clear any leftover interval
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/status/${jobId}`);
        const { status: jobStatus, shorts: jobShorts, error: jobError } = res.data;

        if (jobStatus === "done") {
          clearInterval(pollRef.current);
          setShorts(jobShorts);
          setStatus("Done 🎉");
          setLoading(false);
        } else if (jobStatus === "error") {
          clearInterval(pollRef.current);
          setError(`Processing failed: ${jobError || "unknown error"}`);
          setLoading(false);
        } else {
          // Still processing — show partial clips if any are ready
          if (jobShorts?.length) setShorts(jobShorts);
          setStatus(`Processing… (${jobShorts?.length ?? 0}/3 clips ready)`);
        }
      } catch {
        clearInterval(pollRef.current);
        setError("Lost connection to server. Please try again.");
        setLoading(false);
      }
    }, POLL_INTERVAL_MS);
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!videoFile) {
      setError("Please select a video first.");
      return;
    }

    setLoading(true);
    setShorts([]);
    setError("");
    setStatus("Uploading…");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("duration", duration);

      const res = await axios.post(`${BACKEND_URL}/upload`, formData, {
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setProgress(pct);
          if (pct === 100) setStatus("Upload complete. Processing…");
        },
      });

      const { jobId } = res.data;

      if (!jobId) throw new Error("Server did not return a job ID");

      startPolling(jobId);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Upload failed";
      setError(msg);
      setLoading(false);
    }
  };

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-black text-white min-h-screen font-sans">

      {/* HERO */}
      <section className="text-center py-20 px-6 bg-gradient-to-b from-indigo-900 to-black">
        <h1 className="text-5xl font-bold mb-4">
          Turn Long Videos into Shorts 🚀
        </h1>
        <p className="text-gray-300 mb-6">
          Upload a video and instantly generate 9:16 short clips for Reels, YouTube Shorts & TikTok.
        </p>
        <button
          onClick={() => document.getElementById("app-section").scrollIntoView({ behavior: "smooth" })}
          className="bg-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
        >
          Try Now
        </button>
      </section>

      {/* FEATURES */}
      <section className="py-16 px-6 grid md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
        {[
          { icon: "⚡", title: "Fast Processing", desc: "Split videos in seconds using FFmpeg" },
          { icon: "🎯", title: "9:16 Cropped", desc: "Auto-cropped & portrait-ready for every platform" },
          { icon: "☁️", title: "Cloud Ready", desc: "Accessible anywhere, anytime" },
        ].map(({ icon, title, desc }) => (
          <div key={title}>
            <h3 className="text-xl font-semibold mb-2">{icon} {title}</h3>
            <p className="text-gray-400">{desc}</p>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 px-6 bg-gray-900 text-center">
        <h2 className="text-3xl font-bold mb-6">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6 text-gray-300 max-w-3xl mx-auto">
          <p>1️⃣ Upload your video</p>
          <p>2️⃣ Choose clip duration</p>
          <p>3️⃣ Download your shorts</p>
        </div>
      </section>

      {/* APP */}
      <section id="app-section" className="py-16 px-6 flex flex-col items-center">

        <h2 className="text-3xl font-bold mb-6">Start Creating</h2>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileChange(e.dataTransfer.files[0]);
          }}
          className="border-2 border-dashed border-gray-600 p-10 rounded-xl cursor-pointer w-full max-w-md text-center hover:bg-gray-800 hover:border-indigo-500 transition"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="video/*"
            onChange={(e) => handleFileChange(e.target.files[0])}
          />
          {videoFile ? (
            <div>
              <p className="text-green-400 font-medium">{videoFile.name}</p>
              <p className="text-gray-500 text-sm mt-1">
                {(videoFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-4xl mb-2">🎬</p>
              <p className="text-gray-300">Click or drag & drop your video</p>
              <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI — max {MAX_FILE_MB} MB</p>
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="mt-5 flex items-center gap-3">
          <label className="text-gray-300 text-sm">Clip duration:</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="p-2 bg-gray-800 border border-gray-600 rounded text-white"
          >
            <option value={30}>30 sec</option>
            <option value={45}>45 sec</option>
            <option value={60}>60 sec</option>
          </select>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !videoFile}
          className="mt-5 bg-indigo-600 px-8 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
        >
          {loading ? "Processing…" : "Generate Shorts"}
        </button>

        {/* Progress bar */}
        {loading && (
          <div className="w-full max-w-md mt-5">
            <div className="bg-gray-700 h-2 rounded overflow-hidden">
              <div
                className="bg-indigo-400 h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">{status}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 mt-4 text-sm max-w-md text-center">{error}</p>
        )}

        {/* Output grid */}
        {shorts.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl">
            {shorts.map((url, i) => (
              <div key={i} className="bg-gray-800 p-4 rounded-xl flex flex-col items-center gap-3">
                <p className="text-xs text-gray-400 self-start">Clip {i + 1}</p>
                {/* 9:16 container */}
                <div className="w-full max-w-[240px] aspect-[9/16] overflow-hidden rounded-lg bg-black">
                  <video
                    src={`${BACKEND_URL}${url}`}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>
                <a
                  href={`${BACKEND_URL}${url}`}
                  download
                  className="w-full text-center bg-green-600 hover:bg-green-700 py-2 px-4 rounded-lg text-sm font-medium transition"
                >
                  ⬇ Download
                </a>
              </div>
            ))}
          </div>
        )}

      </section>

      {/* FOOTER */}
      <footer className="text-center py-8 text-gray-600 text-sm">
        Built with ❤️ using React + Node.js + FFmpeg
      </footer>

    </div>
  );
}