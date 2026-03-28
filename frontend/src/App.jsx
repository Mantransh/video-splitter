import React, { useState, useRef } from "react";
import axios from "axios";

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [duration, setDuration] = useState(45);
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  const BACKEND_URL = "https://video-splitter-production-b811.up.railway.app";

  const handleFileChange = (file) => {
    setVideoFile(file);
    setShorts([]);
    setError("");
  };

  const handleSubmit = async () => {
    if (!videoFile) {
      setError("Please select a video");
      return;
    }

    setLoading(true);
    setStatus("Uploading...");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("duration", duration);

      const res = await axios.post(`${BACKEND_URL}/upload`, formData, {
          onUploadProgress: (e) => {
            const percent = Math.round((e.loaded * 100) / e.total);
            setProgress(percent);
            if (percent === 100) setStatus("Processing...");
          },
        });

        if (res.data.status === "processing") {
          setStatus("Processing started... Please wait and refresh.");
          return;
        }

        // 👇 OLD LOGIC (keep this for when backend returns shorts)
        if (Array.isArray(res.data.shorts)) {
          setShorts(res.data.shorts);
          setStatus("Done 🎉");
        } else {
          setError("Failed to generate shorts");
        }
    } catch {
      setError("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black text-white min-h-screen">

      {/* HERO */}
      <section className="text-center py-20 px-6 bg-gradient-to-b from-indigo-900 to-black">
        <h1 className="text-5xl font-bold mb-4">
          Turn Long Videos into Shorts 🚀
        </h1>
        <p className="text-gray-300 mb-6">
          Upload a video and instantly generate short clips for reels, YouTube & TikTok.
        </p>
        <button
          onClick={() => window.scrollTo({ top: 600, behavior: "smooth" })}
          className="bg-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-700"
        >
          Try Now
        </button>
      </section>

      {/* FEATURES */}
      <section className="py-16 px-6 grid md:grid-cols-3 gap-8 text-center">
        <div>
          <h3 className="text-xl font-semibold mb-2">⚡ Fast Processing</h3>
          <p className="text-gray-400">Split videos in seconds using FFmpeg</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">🎯 Smart Clips</h3>
          <p className="text-gray-400">Generate perfectly timed short videos</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">☁️ Cloud Ready</h3>
          <p className="text-gray-400">Accessible anywhere, anytime</p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 px-6 bg-gray-900 text-center">
        <h2 className="text-3xl font-bold mb-6">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6 text-gray-300">
          <p>1️⃣ Upload your video</p>
          <p>2️⃣ Choose duration</p>
          <p>3️⃣ Get short clips instantly</p>
        </div>
      </section>

      {/* APP */}
      <section className="py-16 px-6 flex flex-col items-center">

        <h2 className="text-3xl font-bold mb-6">Start Creating</h2>

        {/* Upload */}
        <div
          onClick={() => fileInputRef.current.click()}
          className="border border-gray-600 p-6 rounded-lg cursor-pointer w-full max-w-md text-center hover:bg-gray-800"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files[0])}
          />
          {videoFile ? videoFile.name : "Click to upload video"}
        </div>

        {/* Duration */}
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="mt-4 p-2 bg-gray-800 rounded"
        >
          <option value={30}>30 sec</option>
          <option value={45}>45 sec</option>
          <option value={60}>60 sec</option>
        </select>

        {/* Button */}
        <button
          onClick={handleSubmit}
          className="mt-4 bg-indigo-600 px-6 py-2 rounded hover:bg-indigo-700"
        >
          Generate Shorts
        </button>

        {/* Progress */}
        {loading && (
          <div className="w-full max-w-md mt-4">
            <div className="bg-gray-700 h-2 rounded">
              <div
                className="bg-green-400 h-2"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-sm">{status}</p>
          </div>
        )}

        {error && <p className="text-red-500 mt-3">{error}</p>}

        {/* OUTPUT */}
        {shorts.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mt-10 w-full">

            {shorts.map((url, i) => (
              <div key={i} className="bg-gray-800 p-4 rounded flex flex-col items-center">

                {/* 🔥 9:16 FIX */}
                <div className="w-full max-w-[320px] aspect-[9/16] overflow-hidden rounded-lg">
                  <video
                    src={url}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>

                <a
                  href={url}
                  download
                  className="mt-3 bg-green-500 text-center py-1 px-4 rounded"
                >
                  Download
                </a>

              </div>
            ))}

          </div>
        )}

      </section>

      {/* FOOTER */}
      <footer className="text-center py-6 text-gray-500">
        Built with ❤️ using React + Node.js + FFmpeg
      </footer>

    </div>
  );
}