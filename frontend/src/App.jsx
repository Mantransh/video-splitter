import React, { useState } from 'react';

function App() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('video', file);
    setLoading(true);
    setError('');
    setShorts([]);

    try {
      const res = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setShorts(data.shorts);
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-center text-indigo-600 mb-6">
          🎬 Video Short Generator
        </h1>

        <div className="flex flex-col items-center gap-4">
          <input
            type="file"
            accept="video/*"
            onChange={handleUpload}
            className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />
          {loading && <p className="text-blue-500">Uploading and processing video...</p>}
          {error && <p className="text-red-500">{error}</p>}
        </div>

        {shorts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Generated Shorts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shorts.map((url, idx) => (
                <video key={idx} controls className="rounded shadow-md">
                  <source src={url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
