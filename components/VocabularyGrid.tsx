"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VocabularyCard from "./VocabularyCard";
import {
  Search,
  Filter,
  Volume2,
  BookOpen,
  Shuffle,
  Play,
  Pause,
} from "lucide-react";

interface VocabularyItem {
  word: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  level: string;
  category?: string;
}

interface VocabularyGridProps {
  vocabularyList: string[];
  title?: string;
  onWordSelect?: (word: string) => void;
}

export default function VocabularyGrid({
  vocabularyList,
  title = "Từ vựng đã trích xuất",
  onWordSelect,
}: VocabularyGridProps) {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [filteredVocabulary, setFilteredVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);

  useEffect(() => {
    if (vocabularyList.length > 0) {
      generateVocabularyData();
    }
  }, [vocabularyList]);

  useEffect(() => {
    filterVocabulary();
  }, [vocabulary, searchTerm, levelFilter]);

  const generateVocabularyData = async () => {
    setLoading(true);
    
    try {
      // Generate vocabulary data with meanings and examples
      const vocabData: VocabularyItem[] = vocabularyList.map((word, index) => {
        // Mock data generation - in production, you'd call an API
        const levels = ['beginner', 'intermediate', 'advanced'];
        const level = levels[index % 3];
        
        // Enhanced Vietnamese-English dictionary
        const meanings: { [key: string]: string } = {
          'lập trình': 'programming',
          'máy tính': 'computer',
          'phần mềm': 'software',
          'ứng dụng': 'application',
          'website': 'website',
          'internet': 'internet',
          'công nghệ': 'technology',
          'thông tin': 'information',
          'dữ liệu': 'data',
          'hệ thống': 'system',
          'mạng': 'network',
          'trí tuệ': 'intelligence',
          'nhân tạo': 'artificial',
          'học máy': 'machine learning',
          'thuật toán': 'algorithm',
          'cơ sở dữ liệu': 'database',
          'giao diện': 'interface',
          'người dùng': 'user',
          'phát triển': 'development',
          'thiết kế': 'design',
          'bảo mật': 'security',
          'mã hóa': 'encryption',
          'đám mây': 'cloud',
          'máy chủ': 'server',
          'ứng dụng di động': 'mobile app',
          'trình duyệt': 'browser',
          'trang web': 'webpage',
          'khung làm việc': 'framework',
          'thư viện': 'library',
          'ngôn ngữ lập trình': 'programming language',
        };

        const examples: { [key: string]: { vi: string; en: string } } = {
          'lập trình': {
            vi: 'Tôi đang học lập trình Python.',
            en: 'I am learning Python programming.'
          },
          'máy tính': {
            vi: 'Máy tính này rất nhanh và hiệu quả.',
            en: 'This computer is very fast and efficient.'
          },
          'công nghệ': {
            vi: 'Công nghệ đang phát triển nhanh chóng.',
            en: 'Technology is developing rapidly.'
          },
          'phần mềm': {
            vi: 'Phần mềm này rất dễ sử dụng.',
            en: 'This software is very easy to use.'
          },
          'ứng dụng': {
            vi: 'Ứng dụng di động này rất hữu ích.',
            en: 'This mobile application is very useful.'
          },
          'dữ liệu': {
            vi: 'Chúng ta cần phân tích dữ liệu này.',
            en: 'We need to analyze this data.'
          },
          'hệ thống': {
            vi: 'Hệ thống hoạt động rất ổn định.',
            en: 'The system operates very stably.'
          },
          'mạng': {
            vi: 'Kết nối mạng internet rất nhanh.',
            en: 'The internet network connection is very fast.'
          },
          'trí tuệ': {
            vi: 'Trí tuệ nhân tạo đang thay đổi thế giới.',
            en: 'Artificial intelligence is changing the world.'
          },
          'thuật toán': {
            vi: 'Thuật toán này rất hiệu quả.',
            en: 'This algorithm is very efficient.'
          },
        };

        const meaning = meanings[word.toLowerCase()] || `meaning of ${word}`;
        const example = examples[word.toLowerCase()] || {
          vi: `Đây là ví dụ với từ "${word}".`,
          en: `This is an example with the word "${word}".`
        };

        return {
          word,
          meaning,
          example: example.vi,
          exampleTranslation: example.en,
          level,
          category: 'technology'
        };
      });

      setVocabulary(vocabData);
    } catch (error) {
      console.error('Error generating vocabulary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVocabulary = () => {
    let filtered = vocabulary;

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

    setFilteredVocabulary(filtered);
  };

  const shuffleVocabulary = () => {
    const shuffled = [...filteredVocabulary].sort(() => Math.random() - 0.5);
    setFilteredVocabulary(shuffled);
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
    if (!isAutoPlaying || index >= filteredVocabulary.length) {
      setIsAutoPlaying(false);
      return;
    }

    const word = filteredVocabulary[index].word;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.8;
      
      utterance.onend = () => {
        setTimeout(() => {
          setCurrentPlayIndex(index + 1);
          playNextWord(index + 1);
        }, 1500); // 1.5 second pause between words
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleWordSpeak = (word: string) => {
    if (onWordSelect) {
      onWordSelect(word);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang tạo dữ liệu từ vựng...</p>
      </div>
    );
  }

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
            {filteredVocabulary.length} từ vựng
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={shuffleVocabulary}
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
        </div>
      </div>

      {/* Auto-play Progress */}
      {isAutoPlaying && (
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700 font-medium">
              Đang phát: {filteredVocabulary[currentPlayIndex]?.word}
            </span>
            <span className="text-blue-600 text-sm">
              {currentPlayIndex + 1} / {filteredVocabulary.length}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentPlayIndex + 1) / filteredVocabulary.length) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Vocabulary Grid */}
      {filteredVocabulary.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Không tìm thấy từ vựng nào</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredVocabulary.map((item, index) => (
              <motion.div
                key={`${item.word}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`${
                  isAutoPlaying && currentPlayIndex === index
                    ? 'ring-2 ring-blue-500 ring-opacity-50'
                    : ''
                }`}
              >
                <VocabularyCard
                  word={item.word}
                  meaning={item.meaning}
                  example={item.example}
                  exampleTranslation={item.exampleTranslation}
                  level={item.level}
                  onSpeak={handleWordSpeak}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}