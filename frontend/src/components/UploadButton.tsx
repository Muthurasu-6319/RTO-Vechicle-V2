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

      // 1. Get Signature from our Backend
      // Replace with your production backend URL later
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      const sigResponse = await fetch(`${backendUrl}/api/cloudinary/sign?folder=${folderPath}`);
      if (!sigResponse.ok) {
        throw new Error('Failed to get upload signature from backend');
      }
      const { timestamp, signature, folder } = await sigResponse.json();

      setProgress(50);

      // 2. Upload to Cloudinary securely
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('api_key', import.meta.env.VITE_CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      // Using 'auto' allows uploading both images and pdfs
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

      const uploadResponse = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('Cloudinary Error:', errorData);
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await uploadResponse.json();
      
      setProgress(100);
      setSuccess(true);
      setIsUploading(false);
      
      if (onUploadSuccess) {
        onUploadSuccess(data.secure_url);
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
