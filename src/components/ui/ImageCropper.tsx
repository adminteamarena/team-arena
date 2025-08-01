import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';

export interface AspectRatio {
  label: string;
  value: string;
  ratio: number;
  width: number;
  height: number;
}

export const INSTAGRAM_RATIOS: AspectRatio[] = [
  { label: 'Square', value: '1:1', ratio: 1, width: 1, height: 1 }
];

interface ImageCropperProps {
  image: File;
  onCropComplete: (croppedImageBlob: Blob, aspectRatio: AspectRatio) => void;
  onCancel: () => void;
}

interface CropState {
  x: number;
  y: number;
  scale: number;
  aspectRatio: AspectRatio;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropComplete, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropState, setCropState] = useState<CropState>({
    x: 0,
    y: 0,
    scale: 1,
    aspectRatio: INSTAGRAM_RATIOS[0] // Default to square
  });


  useEffect(() => {
    const img = document.createElement('img');
    const imageUrl = URL.createObjectURL(image);
    
    img.onload = () => {
      if (imageRef.current) {
        imageRef.current.src = imageUrl;
        setImageLoaded(true);
        
        // Calculate initial scale to fit the image in container
        const containerSize = 280;
        const scaleX = containerSize / img.naturalWidth;
        const scaleY = containerSize / img.naturalHeight;
        const initialScale = Math.max(scaleX, scaleY, 0.5);
        
        setCropState(prev => ({
          ...prev,
          scale: initialScale,
          x: 0,
          y: 0
        }));
      }
    };
    
    img.src = imageUrl;
    
    return () => {
      URL.revokeObjectURL(imageUrl);
    };
  }, [image]);


  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cropState.x,
      y: e.clientY - cropState.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setCropState(prev => ({
      ...prev,
      x: newX,
      y: newY
    }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - cropState.x,
      y: touch.clientY - cropState.y
    });
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    setCropState(prev => ({
      ...prev,
      x: newX,
      y: newY
    }));
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleZoom = (delta: number) => {
    setCropState(prev => ({
      ...prev,
      scale: Math.max(0.2, Math.min(4, prev.scale + delta))
    }));
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container && imageLoaded) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [imageLoaded, handleWheel]);

  const handleReset = () => {
    setCropState(prev => ({
      ...prev,
      x: 0,
      y: 0,
      scale: 1
    }));
  };

  const getCropDimensions = () => {
    const containerSize = 280; // Fixed container size for consistency
    const { aspectRatio } = cropState;
    
    let cropWidth, cropHeight;
    
    if (aspectRatio.ratio >= 1) {
      // Landscape or square
      cropWidth = containerSize * 0.8;
      cropHeight = cropWidth / aspectRatio.ratio;
    } else {
      // Portrait
      cropHeight = containerSize * 0.8;
      cropWidth = cropHeight * aspectRatio.ratio;
    }
    
    return { width: cropWidth, height: cropHeight };
  };

  const handleCrop = async () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const { width: cropWidth, height: cropHeight } = getCropDimensions();
    
    // Set canvas size to match the desired aspect ratio
    const OUTPUT_SIZE = 1080; // Instagram-like output size
    
    if (cropState.aspectRatio.ratio >= 1) {
      // Landscape or square
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE / cropState.aspectRatio.ratio;
    } else {
      // Portrait
      canvas.height = OUTPUT_SIZE;
      canvas.width = OUTPUT_SIZE * cropState.aspectRatio.ratio;
    }
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate the source area from the original image
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    // Calculate the visible area coordinates relative to the original image
    const imgRect = img.getBoundingClientRect();
    const offsetX = (containerRect.left + (containerRect.width - cropWidth) / 2) - imgRect.left;
    const offsetY = (containerRect.top + (containerRect.height - cropHeight) / 2) - imgRect.top;
    
    const sourceX = (-cropState.x - offsetX) / cropState.scale;
    const sourceY = (-cropState.y - offsetY) / cropState.scale;
    const sourceWidth = cropWidth / cropState.scale;
    const sourceHeight = cropHeight / cropState.scale;
    
    // Draw the cropped image
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, canvas.width, canvas.height
    );
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob, cropState.aspectRatio);
      }
    }, 'image/jpeg', 0.9);
  };

  const { width: cropWidth, height: cropHeight } = getCropDimensions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900">Adjust Photo</h3>
          <button
            onClick={handleCrop}
            className="bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={!imageLoaded}
          >
            Next
          </button>
        </div>


        {/* Crop Area */}
        <div className="p-4">
          <div 
            ref={containerRef}
            className="relative mx-auto bg-gray-100 rounded-lg overflow-hidden touch-pan-x touch-pan-y"
            style={{
              width: 320,
              height: 320
            }}
          >
            {/* Crop Frame Overlay */}
            <div 
              className="absolute border-2 border-blue-500 z-10 pointer-events-none"
              style={{
                width: cropWidth,
                height: cropHeight,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Corner guides */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-white"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 border-r-2 border-t-2 border-white"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-l-2 border-b-2 border-white"></div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-white"></div>
            </div>

            {/* Image */}
            {imageLoaded && (
              <img
                ref={imageRef}
                className="absolute select-none cursor-grab active:cursor-grabbing"
                style={{
                  transform: `translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.scale})`,
                  transformOrigin: 'top left',
                  maxWidth: 'none'
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                draggable={false}
                alt="Crop preview"
              />
            )}

            {/* Loading state */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
              </div>
            )}
          </div>

          {/* Simple Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleZoom(-0.2)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-3 h-0.5 bg-current"></div>
                </div>
              </button>
              <button
                onClick={() => handleZoom(0.2)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
              >
                <div className="w-4 h-4 flex items-center justify-center relative">
                  <div className="w-3 h-0.5 bg-current"></div>
                  <div className="w-0.5 h-3 bg-current absolute"></div>
                </div>
              </button>
            </div>
            
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Reset</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-3 text-center">
            <p className="text-gray-500 text-sm">
              Drag to move • Use +/- to zoom • Square crop will be applied
            </p>
          </div>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default ImageCropper;