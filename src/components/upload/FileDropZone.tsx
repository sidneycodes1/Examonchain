'use client';

import React, { useState, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import ProgressBar from '@/components/ui/ProgressBar';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import { Material } from '@/types/database';

interface FileDropZoneProps {
  onUploadComplete: (material: Material) => void;
  onUploadError?: (error: string) => void;
}

export default function FileDropZone({ onUploadComplete, onUploadError }: FileDropZoneProps) {
  const { getAccessToken, user } = usePrivy();
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;

    // Validation
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'gif'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      const msg = 'Unsupported file type. Please upload PDF, PNG, JPG, JPEG, or GIF.';
      setErrorMsg(msg);
      if (onUploadError) onUploadError(msg);
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      const msg = 'File size exceeds 50MB limit.';
      setErrorMsg(msg);
      if (onUploadError) onUploadError(msg);
      return;
    }

    setErrorMsg(null);
    setUploading(true);
    setProgress(0);
    setCurrentFileName(file.name);

    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append('file', file);
      
      const walletAddress = user?.wallet?.address;
      if (walletAddress) {
        formData.append('walletAddress', walletAddress);
      }
      
      const email = user?.email?.address;
      if (email) {
        formData.append('email', email);
      }
      
      const name = email || walletAddress || 'User';
      formData.append('name', name);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/materials', true);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // Track progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };

      // Completed
      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText) as { success: boolean; data?: Material; error?: string };
            if (res.success && res.data) {
              setToast({ message: 'Study material uploaded successfully!', type: 'success' });
              onUploadComplete(res.data);
            } else {
              const msg = res.error || 'Upload failed';
              setErrorMsg(msg);
              setToast({ message: msg, type: 'error' });
              if (onUploadError) onUploadError(msg);
            }
          } catch {
            const msg = 'Failed to parse server response';
            setErrorMsg(msg);
            setToast({ message: msg, type: 'error' });
            if (onUploadError) onUploadError(msg);
          }
        } else {
          try {
            const res = JSON.parse(xhr.responseText) as { error?: string };
            const msg = res.error || `Upload failed with status ${xhr.status}`;
            setErrorMsg(msg);
            setToast({ message: msg, type: 'error' });
            if (onUploadError) onUploadError(msg);
          } catch {
            const msg = `Upload failed with status ${xhr.status}`;
            setErrorMsg(msg);
            setToast({ message: msg, type: 'error' });
            if (onUploadError) onUploadError(msg);
          }
        }
      };

      // Error
      xhr.onerror = () => {
        setUploading(false);
        const msg = 'Network connection error during upload.';
        setErrorMsg(msg);
        setToast({ message: msg, type: 'error' });
        if (onUploadError) onUploadError(msg);
      };

      xhr.send(formData);
    } catch (err) {
      setUploading(false);
      const msg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setErrorMsg(msg);
      setToast({ message: msg, type: 'error' });
      if (onUploadError) onUploadError(msg);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={!uploading ? onButtonClick : undefined}
        className={`w-full min-h-[180px] rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 relative overflow-hidden ${
          isDragActive
            ? 'border-[#00C896] bg-[#00C896]/5 shadow-[0_0_15px_rgba(0,200,150,0.15)]'
            : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#00C896]/50'
        } ${uploading ? 'cursor-not-allowed pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.gif"
          onChange={handleChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="w-full flex flex-col items-center gap-3 py-4">
            <Spinner size="medium" />
            <div className="text-center w-full max-w-[80%]">
              <p className="text-sm font-medium text-[#F5F5F7] truncate mb-1">
                Uploading {currentFileName}
              </p>
              <p className="text-xs text-[#A0A0A0] mb-3">{progress}% complete</p>
              <ProgressBar value={progress} color="success" />
            </div>
          </div>
        ) : (
          <>
            <div className={`p-3 rounded-full bg-[#2A2A2A] text-[#00C896] hover:bg-[#00C896]/10 transition-colors`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#F5F5F7]">
                Drag and drop your file here, or <span className="text-[#00C896] font-semibold hover:underline">browse</span>
              </p>
              <p className="text-xs text-[#A0A0A0] mt-1">
                Supports PDF, PNG, JPG, JPEG, GIF up to 50MB
              </p>
            </div>
          </>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-xs text-[#FF3B30] flex gap-2 items-center">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}