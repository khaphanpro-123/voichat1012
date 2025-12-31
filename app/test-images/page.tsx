"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, TestTube, CheckCircle, XCircle, Loader } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";

interface TestResult {
  word: string;
  success: boolean;
  imageUrl?: string;
  source?: string;
  confidence?: number;
  description?: string;
  error?: string;
}

export default function TestImagesPage() {
  const [testWord, setTestWord] = useState('lập trình');
  const [singleResult, setSingleResult] = useState<TestResult | null>(null);
  const [batchResults, setBatchResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const testSingleWord = async () => {
    setLoading(true);
    setSingleResult(null);

    try {
      const response = await fetch(`/api/test-image-search?word=${encodeURIComponent(testWord)}`);
      const data = await response.json();
      
      if (data.success) {
        setSingleResult(data.result);
      }
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testBatchWords = async () => {
    setBatchLoading(true);
    setBatchResults([]);

    const testWords = [
      'lập trình', 'máy tính', 'phần mềm', 'internet', 'website',
      'học tập', 'giáo dục', 'sách', 'kiến thức',
      'gia đình', 'bạn bè', 'yêu thương',
      'chạy', 'viết', 'đọc', 'nói',
      'kinh doanh', 'làm việc', 'công ty',
      'cây', 'hoa', 'thiên nhiên',
      'ăn', 'nấu ăn', 'thức ăn'
    ];

    try {
      const response = await fetch('/api/test-image-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: testWords })
      });

      const data = await response.json();
      
      if (data.success) {
        setBatchResults(data.results);
      }
    } catch (error) {
      console.error('Batch test error:', error);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧪 Test Hệ thống Tìm Hình ảnh
          </h1>
          <p className="text-gray-600">
            Kiểm tra độ chính xác của hệ thống tìm hình ảnh cho từ vựng tiếng Việt
          </p>
        </div>

        {/* Single Word Test */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Test Từ Đơn Lẻ
          </h2>
          
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                value={testWord}
                onChange={(e) => setTestWord(e.target.value)}
                placeholder="Nhập từ vựng cần test..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={testSingleWord}
              disabled={loading || !testWord.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Test
            </button>
          </div>

          {singleResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-2 gap-6"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Kết quả cho: "{testWord}"
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {singleResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={singleResult.success ? 'text-green-700' : 'text-red-700'}>
                      {singleResult.success ? 'Thành công' : 'Thất bại'}
                    </span>
                  </div>
                  
                  {singleResult.confidence && (
                    <div>
                      <span className="font-medium">Độ chính xác: </span>
                      <span className={`font-bold ${
                        singleResult.confidence >= 80 ? 'text-green-600' :
                        singleResult.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {singleResult.confidence}%
                      </span>
                    </div>
                  )}
                  
                  {singleResult.source && (
                    <div>
                      <span className="font-medium">Nguồn: </span>
                      <span className="text-blue-600">{singleResult.source}</span>
                    </div>
                  )}
                  
                  {singleResult.description && (
                    <div>
                      <span className="font-medium">Mô tả: </span>
                      <span className="text-gray-700">{singleResult.description}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                {singleResult.imageUrl && (
                  <ImageWithFallback
                    src={singleResult.imageUrl}
                    alt={testWord}
                    word={testWord}
                    meaning="Test image"
                    className="w-full h-64 rounded-xl"
                    confidence={singleResult.confidence}
                    source={singleResult.source}
                  />
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Batch Test */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Test Hàng Loạt
            </h2>
            <button
              onClick={testBatchWords}
              disabled={batchLoading}
              className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-2"
            >
              {batchLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <TestTube className="w-5 h-5" />
              )}
              Test 25 từ vựng
            </button>
          </div>

          {batchLoading && (
            <div className="text-center py-12">
              <Loader className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-gray-600">Đang test hàng loạt từ vựng...</p>
            </div>
          )}

          {batchResults.length > 0 && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {batchResults.filter(r => r.success).length}
                  </div>
                  <div className="text-green-700">Thành công</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {batchResults.filter(r => !r.success).length}
                  </div>
                  <div className="text-red-700">Thất bại</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(
                      batchResults
                        .filter(r => r.confidence)
                        .reduce((sum, r) => sum + (r.confidence || 0), 0) / 
                      batchResults.filter(r => r.confidence).length || 0
                    )}%
                  </div>
                  <div className="text-blue-700">Độ chính xác TB</div>
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batchResults.map((result, index) => (
                  <motion.div
                    key={result.word}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">{result.word}</h3>
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    
                    {result.imageUrl && (
                      <div className="mb-3">
                        <img
                          src={result.imageUrl}
                          alt={result.word}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-1 text-sm">
                      {result.confidence && (
                        <div className="flex justify-between">
                          <span>Độ chính xác:</span>
                          <span className={`font-bold ${
                            result.confidence >= 80 ? 'text-green-600' :
                            result.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {result.confidence}%
                          </span>
                        </div>
                      )}
                      {result.source && (
                        <div className="flex justify-between">
                          <span>Nguồn:</span>
                          <span className="text-blue-600">{result.source}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}