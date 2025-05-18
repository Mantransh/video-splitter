// File: src/App.jsx or App.js

import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [duration, setDuration] = useState(60);
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    setVideoFile(e.target.files[0]);
    setShorts([]);
    setError('');
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
      setError('Please select a video file');
      return;
    }

    if (videoFile.size > 100 * 1024 * 1024) {
      setError('Max file size is 100 MB');
      return;
    }

    setLoading(true);
    setError('');
    setShorts([]);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('duration', duration);

      // Change this URL to your deployed backend URL or localhost for testing
      const res = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShorts(res.data.shorts || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
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

        {/* Custom Choose Video button */}
        <button
          type="button"
          onClick={openFilePicker}
          className="w-full mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded"
        >
          {videoFile ? `Selected: ${videoFile.name}` : 'Choose Video'}
        </button>

        <label className="block mb-4 font-semibold">
          Select Shorts Duration (seconds)
          <select
            value={duration}
            onChange={handleDurationChange}
            className="mt-1 block w-full border border-gray-300 rounded p-2"
          >
            <option value={30}>30</option>
            <option value={45}>45</option>
            <option value={60}>60</option>
            <option value={90}>90</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading || !videoFile}
          className={`w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50`}
        >
          {loading ? 'Processing...' : 'Submit'}
        </button>

        {error && (
          <p className="mt-4 text-red-600 font-semibold text-center">{error}</p>
        )}
      </form>

      {shorts.length > 0 && (
        <div className="mt-8 w-full max-w-3xl">
          <h2 className="text-2xl font-semibold mb-4">Generated Shorts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {shorts.map((url, i) => (
              <div key={i} className="bg-white rounded shadow p-2">
                <video controls src={url} className="w-full h-auto rounded" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline block mt-2 text-center break-all"
                >
                  {url}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
