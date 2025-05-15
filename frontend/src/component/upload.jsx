// src/components/Upload.jsx

import { useState } from "react";

export default function Upload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setShorts([]);
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("video", selectedFile);

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed!");

      const data = await res.json();
      setShorts(data.shorts);
    } catch (err) {
      setError(err.message || "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center gap-6">
      <h1 className="text-3xl font-bold text-indigo-600">🎬 Video Splitter</h1>

      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        disabled={!selectedFile || loading}
      >
        {loading ? "Uploading..." : "Upload & Split"}
      </button>

      {error && <p className="text-red-500 font-semibold">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
        {shorts.map((url, index) => (
          <div key={index} className="bg-white shadow rounded p-2">
            <video
              src={url}
              controls
              className="w-full h-auto rounded"
            />
            <p className="text-sm text-center mt-1">Short {index + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
