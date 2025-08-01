import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface SelectedFile {
  file: File;
  preview: string;
}

interface SimpleFilePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
}

const SimpleFilePicker: React.FC<SimpleFilePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  accept = 'image/*',
  maxSize = 10
}) => {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    setSelectedFile({ file, preview });
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onSelect(selectedFile.file);
      handleClose();
    }
  };

  const handleClose = () => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.preview);
      setSelectedFile(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Select Photo</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!selectedFile ? (
            /* File Selection */
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-gray-500" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Choose a photo
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Select an image from your device
                  </p>
                  <button
                    onClick={triggerFileInput}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Browse Files
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    Max file size: {maxSize}MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Preview */
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Preview
                </h4>
                <div className="relative inline-block">
                  <img
                    src={selectedFile.preview}
                    alt="Preview"
                    className="max-w-full max-h-64 rounded-lg shadow-md"
                  />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {selectedFile.file.name}
                </div>
                <div className="text-xs text-gray-400">
                  {(selectedFile.file.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    URL.revokeObjectURL(selectedFile.preview);
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Choose Different
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default SimpleFilePicker;