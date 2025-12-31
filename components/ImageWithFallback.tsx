"use client";
import { useState } from "react";
import { RefreshCw, Image as ImageIcon, Loader } from "lucide-react";

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  word: string;
  meaning?: string;
  className?: string;
  onImageRegenerate?: () => void;
  alternatives?: Array<{
    url: string;
    source: string;
    description?: string;
    confidence?: number;
  }>;
  confidence?: number;
  source?: string;
}

export default function ImageWithFallback({
  src,
  alt,
  word,
  meaning,
  className = "",
  onImageRegenerate,
  alternatives = [],
  confidence = 0,
  source = 'unknown'
}: ImageWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [alternativeIndex, setAlternativeIndex] = useState(0);

  const handleImageError = () => {
    setError(true);
    
    // Try alternatives if available
    if (alternatives.length > alternativeIndex) {
      const nextAlt = alternatives[alternativeIndex];
      setCurrentSrc(nextAlt.url);
      setAlternativeIndex(prev => prev + 1);
      setError(false);
    }
  };

  const handleRegenerate = async () => {
    if (!onImageRegenerate) return;
    
    setLoading(true);
    setError(false);
    
    try {
      await onImageRegenerate();
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const tryNextAlternative = () => {
    if (alternatives.length > alternativeIndex) {
      const nextAlt = alternatives[alternativeIndex];
      setCurrentSrc(nextAlt.url);
      setAlternativeIndex(prev => prev + 1);
      setError(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Đang tạo hình ảnh...</p>
        </div>
      </div>
    );
  }

  if (error || !currentSrc) {
    return (
      <div className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="font-bold text-gray-700 mb-2">{word}</h3>
          {meaning && (
            <p className="text-gray-600 text-sm mb-4">{meaning}</p>
          )}
          
          <div className="flex flex-col gap-2">
            {onImageRegenerate && (
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 mx-auto text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Tạo hình ảnh
              </button>
            )}
            
            {alternatives.length > alternativeIndex && (
              <button
                onClick={tryNextAlternative}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm"
              >
                Thử ảnh khác
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img
        src={currentSrc}
        alt={alt}
        className="w-full h-full object-cover"
        onError={handleImageError}
        onLoad={() => setError(false)}
      />
      
      {/* Regenerate button overlay */}
      {onImageRegenerate && (
        <button
          onClick={handleRegenerate}
          className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition opacity-0 hover:opacity-100 group-hover:opacity-100"
          title="Tạo lại hình ảnh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
      
      {/* Image quality indicator */}
      {confidence > 0 && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
          {confidence}% match
        </div>
      )}

      {/* Source indicator */}
      {source && source !== 'unknown' && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
          {source}
        </div>
      )}

      {/* Alternative images indicator */}
      {alternatives.length > 0 && (
        <div className="absolute bottom-2 left-2 flex gap-1">
          {alternatives.slice(0, 3).map((alt, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentSrc(alt.url);
                setAlternativeIndex(index + 1);
                setError(false);
              }}
              className="w-2 h-2 rounded-full bg-white bg-opacity-50 hover:bg-opacity-100 transition"
              title={`Alternative ${index + 1}: ${alt.confidence || 0}% match`}
            />
          ))}
        </div>
      )}
    </div>
  );
}