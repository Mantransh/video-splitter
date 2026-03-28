// src/App.jsx

import React, { useState, useRef } from "react";
import axios from "axios";

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [duration, setDuration] = useState(45);
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const BACKEND_URL = "https://video-splitter-production-b811.up.railway.app";

  const handleFileChange = (e) => {
    setVideoFile(e.target.files[0]);
    setShorts([]);
    setError("");
  };

  const handleDurationChange = (e) => {
    setDuration(parseInt(e.target.value));
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoFile) {
      setError("Please select a video file");
      return;
    }

    if (videoFile.size > 100 * 1024 * 1024) {
      setError("Max file size is 100MB");
      return;
    }

    setLoading(true);
    setError("");
    setShorts([]);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("duration", duration);

      const res = await axios.post(
        `${BACKEND_URL}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      console.log("Response:", res.data);

      // ✅ SAFE handling (prevents crash)
      if (res.data && Array.isArray(res.data.shorts)) {
        setShorts(res.data.shorts);
      } else {
        setError("No shorts generated or server error");
      }

    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
        "Upload failed. Server error or timeout."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">🎬 Video Shortener</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-md"
      >
        {/* Hidden file input */}
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />

        {/* Choose button */}
        <button
          type="button"
          onClick={openFilePicker}
          className="w-full mb-4 bg-gray-300 hover:bg-gray-400 py-2 rounded"
        >
          {videoFile ? videoFile.name : "Choose Video"}
        </button>

        {/* Duration */}
        <label className="block mb-4 font-semibold">
          Select Duration
          <select
            value={duration}
            onChange={handleDurationChange}
            className="mt-1 w-full border p-2 rounded"
          >
            <option value={30}>30 sec</option>
            <option value={45}>45 sec</option>
            <option value={60}>60 sec</option>
          </select>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !videoFile}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {loading ? "Processing..." : "Submit"}
        </button>

        {/* Error */}
        {error && (
          <p className="mt-4 text-red-600 text-center">{error}</p>
        )}
      </form>

      {/* Shorts */}
      <div className="mt-8 w-full max-w-4xl">
        {Array.isArray(shorts) && shorts.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold mb-4">
              Generated Shorts
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {shorts.map((url, i) => (
                <div key={i} className="bg-white p-2 rounded shadow">
                  <video
                    controls
                    src={url}
                    className="w-full rounded"
                  />

                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm block mt-2 break-all"
                  >
                    Open Video
                  </a>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}