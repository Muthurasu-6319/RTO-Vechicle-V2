import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadButtonProps {
  onUploadSuccess?: (downloadUrl: string) => void;
  folderPath?: string;
}

const UploadButton: React.FC<UploadButtonProps> = ({ onUploadSuccess, folderPath = 'documents' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    setSuccess(false);
    setProgress(0);

    try {
      let fileToUpload: File | Blob = file;

      // Compress if it's an image
      if (file.type.startsWith('image/')) {
        setProgress(10);
        const options = {
          maxSizeMB: 0.2, // Compress to max 200KB
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        };
        fileToUpload = await imageCompression(file, options);
      }

      setProgress(30);

      // Upload to backend which uploads to B2 (avoids CORS)
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      
      const formData = new FormData();
      formData.append('file', fileToUpload, file.name);
      formData.append('folder', folderPath);

      setProgress(50);

      const uploadResponse = await fetch(`${backendUrl}/api/upload/file`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('Upload Error:', errorData);
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await uploadResponse.json();
      
      setProgress(100);
      setSuccess(true);
      setIsUploading(false);
      
      if (onUploadSuccess) {
        onUploadSuccess(data.fileUrl);
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while uploading.');
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '300px' }}>
      <label 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          backgroundColor: isUploading ? '#e2e8f0' : 'var(--primary-color)',
          color: isUploading ? 'var(--text-secondary)' : 'white',
          borderRadius: '0.5rem',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          fontWeight: 500,
          transition: 'all 0.2s ease',
        }}
      >
        <UploadCloud size={20} />
        {isUploading ? `Uploading... ${progress}%` : 'Upload File'}
        <input 
          type="file" 
          accept="image/*,application/pdf" 
          onChange={handleFileChange} 
          disabled={isUploading}
          style={{ display: 'none' }}
        />
      </label>

      {error && (
        <div style={{ color: 'var(--secondary-color)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
          <CheckCircle size={16} />
          Upload Successful!
        </div>
      )}
    </div>
  );
};

export default UploadButton;
