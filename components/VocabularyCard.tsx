"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Loader,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface VocabularyImage {
  id: string;
  url: string;
  fullUrl: string;
  description: string;
  photographer: string;
  photographerUrl: string;
}

interface VocabularyCardProps {
  word: string;
  meaning?: string;
  example?: string;
  exampleTranslation?: string;
  level?: string;
  onSpeak?: (text: string) => void;
}

export default function VocabularyCard({
  word,
  meaning,
  example,
  exampleTranslation,
  level = "intermediate",
  onSpeak,
}: VocabularyCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [images, setImages] = useState<VocabularyImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<VocabularyImage | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchImages();
  }, [word, meaning]);

  const fetchImages = async () => {
    setLoadingImages(true);
    setImageError(false);
    
    try {
      const response = await fetch('/api/vocabulary-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, meaning })
      });

      const data = await response.json();
      if (data.success && data.images.length > 0) {
        setImages(data.images);
        setSelectedImage(data.images[0]);
      } else {
        setImageError(true);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      setImageError(true);
    } finally {
      setLoadingImages(false);
    }
  };

  const speakText = (text: string) => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if ('speechSynthesis' in window) {
      setIsPlaying(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
      
      if (onSpeak) {
        onSpeak(text);
      }
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
    >
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100">
        {loadingImages ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : selectedImage && !imageError ? (
          <>
            <img
              src={selectedImage.url}
              alt={selectedImage.description}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Photo by {selectedImage.photographer}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No image available</p>
              <button
                onClick={fetchImages}
                className="mt-2 p-1 text-blue-500 hover:text-blue-600"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* Level Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(level)}`}>
            {level}
          </span>
        </div>

        {/* Image Selector */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-3 flex gap-1">
            {images.map((img, index) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(img)}
                className={`w-2 h-2 rounded-full transition ${
                  selectedImage?.id === img.id ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Word and Audio */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-900">{word}</h3>
          <button
            onClick={() => speakText(word)}
            className={`p-3 rounded-full transition ${
              isPlaying
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
            title={isPlaying ? 'Stop pronunciation' : 'Play pronunciation'}
          >
            {isPlaying ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Meaning */}
        {meaning && (
          <div className="mb-4">
            <p className="text-lg text-gray-700 font-medium">{meaning}</p>
          </div>
        )}

        {/* Example */}
        {example && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Example
              </h4>
              <button
                onClick={() => speakText(example)}
                className="p-1 text-gray-500 hover:text-blue-600 transition"
                title="Play example"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-gray-800 mb-2 italic">"{example}"</p>
            {exampleTranslation && (
              <p className="text-gray-600 text-sm">"{exampleTranslation}"</p>
            )}
          </div>
        )}

        {/* Image Attribution */}
        {selectedImage && selectedImage.photographerUrl !== '#' && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <a
              href={selectedImage.photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition"
            >
              <ExternalLink className="w-3 h-3" />
              Photo by {selectedImage.photographer} on Unsplash
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}