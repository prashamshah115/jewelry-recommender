import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { validatePDF } from '../lib/pdfExtractor';
import { toast } from 'sonner';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, metadata: UploadMetadata) => Promise<void>;
}

export interface UploadMetadata {
  title: string;
  subject?: string;
  learningGoal?: string;
}

type UploadStage = 'select' | 'metadata' | 'uploading' | 'extracting' | 'saving' | 'done' | 'error';

export function UploadDialog({ open, onOpenChange, onUpload }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>('select');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');
  
  // Metadata form
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  
  // Track if upload is in progress
  const [isUploading, setIsUploading] = useState(false);
  const uploadAbortedRef = useState({ current: false })[0];

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const selectedFile = acceptedFiles[0];
    const validation = validatePDF(selectedFile);

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setFile(selectedFile);
    setTitle(selectedFile.name.replace('.pdf', ''));
    setStage('metadata');
    setError('');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    try {
      setStage('uploading');
      setProgress(0);
      setIsUploading(true);
      uploadAbortedRef.current = false;

      const metadata: UploadMetadata = {
        title: title.trim() || file.name.replace('.pdf', ''),
        subject: subject.trim() || undefined,
        learningGoal: learningGoal.trim() || undefined,
      };

      await onUpload(file, metadata);
      
      // Check if upload was aborted
      if (uploadAbortedRef.current) {
        console.log('[Upload] Aborted by user');
        return;
      }
      
      setStage('done');
      setProgress(100);
      setIsUploading(false);
      
      // Close dialog after brief success message
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      if (uploadAbortedRef.current) {
        // Aborted, don't show error
        return;
      }
      console.error('[Upload] Error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStage('error');
      setIsUploading(false);
    }
  };
  
  const handleCancel = () => {
    if (isUploading) {
      uploadAbortedRef.current = true;
      toast.error('Upload canceled - note: this may not stop all processing');
    }
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setStage('select');
    setProgress(0);
    setError('');
    setTitle('');
    setSubject('');
    setLearningGoal('');
    onOpenChange(false);
  };

  console.log('[UploadDialog] Render - open:', open, 'stage:', stage);

  // TEMPORARY: Bypass Radix and use plain HTML dialog
  if (open) {
    return (
      <>
        {/* Overlay */}
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 50
          }}
          onClick={() => {
            // Prevent closing during upload without confirmation
            if (isUploading) {
              if (confirm('Upload in progress. Cancel upload and close?')) {
                handleCancel();
              }
            } else {
              onOpenChange(false);
            }
          }}
        />
        
        {/* Dialog Content */}
        <div style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 51,
          width: '90%',
          maxWidth: '500px',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }}>
          <button
            onClick={() => {
              if (isUploading) {
                if (confirm('Upload in progress. Cancel upload and close?')) {
                  handleCancel();
                }
              } else {
                onOpenChange(false);
              }
            }}
            style={{
              position: 'absolute',
              right: '16px',
              top: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ×
          </button>
          
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Upload Textbook
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
            Upload a PDF textbook to start reading with AI assistance
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stage === 'select' && (
              <div
                {...getRootProps()}
                style={{
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  padding: '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragActive ? '#f0f9ff' : 'transparent'
                }}
              >
                <input {...getInputProps()} />
                <Upload style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#999' }} />
                {isDragActive ? (
                  <p style={{ fontSize: '14px', fontWeight: '500' }}>Drop PDF here...</p>
                ) : (
                  <>
                    <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Drag & drop PDF here, or click to browse
                    </p>
                    <p style={{ fontSize: '12px', color: '#999' }}>Maximum file size: 50MB</p>
                  </>
                )}
              </div>
            )}
            
            {stage === 'metadata' && file && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500' }}>{file.name}</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Deep Learning Fundamentals"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                    Subject (optional)
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Machine Learning, Physics"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <button
                  onClick={handleUpload}
                  disabled={!title.trim()}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: title.trim() ? '#000' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: title.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Upload & Process
                </button>
              </div>
            )}
            
            {(stage === 'uploading' || stage === 'extracting' || stage === 'saving') && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #000',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }} />
                </div>
                <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  {stage === 'uploading' && 'Uploading PDF...'}
                  {stage === 'extracting' && 'Extracting text from pages...'}
                  {stage === 'saving' && 'Saving to database...'}
                </p>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                  {progress > 0 ? `${Math.round(progress)}%` : 'Please wait...'}
                </p>
                <p style={{ fontSize: '11px', color: '#999', marginBottom: '12px' }}>
                  This may take a few minutes for large PDFs
                </p>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: 'white',
                    color: '#dc2626',
                    border: '1px solid #dc2626',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Cancel Upload
                </button>
              </div>
            )}
            
            {stage === 'done' && (
              <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '6px', textAlign: 'center' }}>
                <p style={{ fontSize: '16px', color: '#16a34a', marginBottom: '4px' }}>✓ Upload Complete!</p>
                <p style={{ fontSize: '12px', color: '#15803d' }}>Opening your textbook...</p>
              </div>
            )}
            
            {stage === 'error' && (
              <div>
                <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '6px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '4px' }}>Upload Failed</p>
                  <p style={{ fontSize: '12px', color: '#991b1b' }}>{error}</p>
                </div>
                <button
                  onClick={() => setStage('select')}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    color: '#000',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
  
  return null;
}

