"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Volume2,
  BookOpen,
  Shuffle,
  Play,
  Pause,
  Loader,
  RefreshCw,
  Image as ImageIcon,
  Star,
  Clock,
  TrendingUp,
} from "lucide-react";
import VocabularyExtractionLoader from "./VocabularyExtractionLoader";
import ImageWithFallback from "./ImageWithFallback";

interface VocabularyItem {
  _id: string;
  word: string;
  type: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  level: string;
  category: string;
  imageUrl?: string;
  imagePrompt?: string;
  
  // SRS data
  timesReviewed: number;
  timesCorrect: number;
  timesIncorrect: number;
  isLearned: boolean;
  nextReviewDate: string;
}

interface VocabularyGridEnhancedProps {
  documentId?: string;
  userId?: string;
  title?: string;
}

export default function VocabularyGridEnhanced({
  documentId,
  userId = 'anonymous',
  title = "Từ vựng đã trích xuất",
}: VocabularyGridEnhancedProps) {
  const [vocabularies, setVocabularies] = useState<VocabularyItem[]>([]);
  const [filteredVocabularies, setFilteredVocabularies] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  useEffect(() => {
    fetchVocabularies();
  }, [documentId, userId]);

  useEffect(() => {
    filterVocabularies();
  }, [vocabularies, searchTerm, levelFilter, categoryFilter]);

  const fetchVocabularies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        userId,
        limit: '100'
      });
      
      if (documentId) {
        // If documentId is provided, extract vocabulary from that document
        setExtracting(true);
        setExtractionProgress(0);
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setExtractionProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + Math.random() * 10;
          });
        }, 1000);

        const extractResponse = await fetch('/api/extract-vocabulary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId, userId })
        });
        
        clearInterval(progressInterval);
        setExtractionProgress(100);
        
        const extractData = await extractResponse.json();
        if (extractData.success) {
          setVocabularies(extractData.data.vocabularies);
        }
        
        setTimeout(() => {
          setExtracting(false);
        }, 1000);
      } else {
        // Otherwise, get all vocabularies for the user
        const response = await fetch(`/api/extract-vocabulary?${params}`);
        const data = await response.json();
        
        if (data.success) {
          setVocabularies(data.vocabularies);
        }
      }
    } catch (error) {
      console.error('Error fetching vocabularies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVocabularies = () => {
    let filtered = vocabularies;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.meaning.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (levelFilter !== "all") {
      filtered = filtered.filter((item) => item.level === levelFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    setFilteredVocabularies(filtered);
  };

  const shuffleVocabularies = () => {
    const shuffled = [...filteredVocabularies].sort(() => Math.random() - 0.5);
    setFilteredVocabularies(shuffled);
  };

  const startAutoPlay = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      return;
    }

    setIsAutoPlaying(true);
    setCurrentPlayIndex(0);
    playNextWord(0);
  };

  const playNextWord = (index: number) => {
    if (!isAutoPlaying || index >= filteredVocabularies.length) {
      setIsAutoPlaying(false);
      return;
    }

    const word = filteredVocabularies[index].word;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.8;
      
      utterance.onend = () => {
        setTimeout(() => {
          setCurrentPlayIndex(index + 1);
          playNextWord(index + 1);
        }, 1500);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleImageError = (vocabId: string) => {
    setImageErrors(prev => new Set([...prev, vocabId]));
  };

  const regenerateImage = async (vocab: VocabularyItem) => {
    try {
      const response = await fetch('/api/smart-image-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: vocab.word,
          meaning: vocab.meaning,
          type: vocab.type,
          example: vocab.example
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update the vocabulary in the list with new image data
        setVocabularies(prev => 
          prev.map(v => 
            v._id === vocab._id 
              ? { 
                  ...v, 
                  imageUrl: data.imageUrl,
                  confidence: data.confidence,
                  source: data.source,
                  alternatives: data.alternatives
                }
              : v
          )
        );
        // Remove from error set
        setImageErrors(prev => {
          const newSet = new Set(prev);
          newSet.delete(vocab._id);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error regenerating image:', error);
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

  const getSuccessRate = (vocab: VocabularyItem) => {
    if (vocab.timesReviewed === 0) return null;
    return Math.round((vocab.timesCorrect / vocab.timesReviewed) * 100);
  };

  if (loading || extracting) {
    return (
      <>
        {extracting && (
          <VocabularyExtractionLoader 
            progress={extractionProgress}
            currentStep={
              extractionProgress < 20 ? "Phân tích văn bản thông minh..." :
              extractionProgress < 40 ? "Trích xuất từ vựng có ý nghĩa..." :
              extractionProgress < 70 ? "Tạo hình ảnh minh họa..." :
              extractionProgress < 90 ? "Chuẩn bị âm thanh phát âm..." :
              "Hoàn thành!"
            }
          />
        )}
        {loading && !extracting && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải từ vựng...</p>
          </div>
        )}
      </>
    );
  }

  const categories = [...new Set(vocabularies.map(v => v.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            {title}
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredVocabularies.length} từ vựng với hình ảnh minh họa
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={shuffleVocabularies}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Xáo trộn
          </button>
          <button
            onClick={startAutoPlay}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
              isAutoPlaying
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {isAutoPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                Dừng phát
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Phát tự động
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm từ vựng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tất cả cấp độ</option>
            <option value="beginner">Cơ bản</option>
            <option value="intermediate">Trung cấp</option>
            <option value="advanced">Nâng cao</option>
          </select>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-play Progress */}
      {isAutoPlaying && (
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700 font-medium">
              Đang phát: {filteredVocabularies[currentPlayIndex]?.word}
            </span>
            <span className="text-blue-600 text-sm">
              {currentPlayIndex + 1} / {filteredVocabularies.length}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentPlayIndex + 1) / filteredVocabularies.length) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Vocabulary Grid */}
      {filteredVocabularies.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Không tìm thấy từ vựng nào</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredVocabularies.map((vocab, index) => (
              <motion.div
                key={`${vocab._id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                  isAutoPlaying && currentPlayIndex === index
                    ? 'ring-2 ring-blue-500 ring-opacity-50'
                    : ''
                }`}
              >
                {/* Image Section */}
                <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100 group">
                  <ImageWithFallback
                    src={vocab.imageUrl}
                    alt={vocab.word}
                    word={vocab.word}
                    meaning={vocab.meaning}
                    className="w-full h-full"
                    onImageRegenerate={() => regenerateImage(vocab)}
                  />
                  
                  {/* Level Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(vocab.level)}`}>
                      {vocab.level}
                    </span>
                  </div>

                  {/* Learning Status */}
                  {vocab.isLearned && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-green-500 text-white p-1 rounded-full">
                        <Star className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6">
                  {/* Word and Audio */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">{vocab.word}</h3>
                    <button
                      onClick={() => speakWord(vocab.word)}
                      className="p-3 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition"
                      title="Phát âm"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Type and Meaning */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                        {vocab.type}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-lg">
                        {vocab.category}
                      </span>
                    </div>
                    <p className="text-lg text-gray-700 font-medium">{vocab.meaning}</p>
                  </div>

                  {/* Example */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        Ví dụ
                      </h4>
                      <button
                        onClick={() => speakWord(vocab.example)}
                        className="p-1 text-gray-500 hover:text-blue-600 transition"
                        title="Phát âm ví dụ"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-gray-800 mb-2 italic">"{vocab.example}"</p>
                    <p className="text-gray-600 text-sm">"{vocab.exampleTranslation}"</p>
                  </div>

                  {/* Learning Stats */}
                  {vocab.timesReviewed > 0 && (
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Đã ôn {vocab.timesReviewed} lần</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>{getSuccessRate(vocab)}% đúng</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}