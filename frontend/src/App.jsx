import React, { useState } from 'react';

export default function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a video file first.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessage('Upload successful! Shorts URLs:\n' + data.shorts.join('\n'));
    } catch (error) {
      setMessage('Upload failed: ' + error.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Upload Video for Shorts</h2>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      <button onClick={handleUpload} style={{ marginTop: 10 }}>
        Upload
      </button>
      <pre style={{ whiteSpace: 'pre-wrap', marginTop: 20 }}>{message}</pre>
    </div>
  );
}
