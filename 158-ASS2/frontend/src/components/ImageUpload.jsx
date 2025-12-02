import React, { useRef } from 'react'

function ImageUpload({ file, onChange }) {
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      onChange(selectedFile)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      onChange(droppedFile)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const removeImage = () => {
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="image-upload">
      <div
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        {file ? (
          <div className="image-preview">
            <img
              src={URL.createObjectURL(file)}
              alt="Preview"
              className="preview-image"
            />
            <button
              className="remove-image"
              onClick={(e) => {
                e.stopPropagation()
                removeImage()
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            <span>📷</span>
            <p>Drag & drop image or click to upload</p>
            <p className="upload-hint">Upload a reference ring image</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default ImageUpload



