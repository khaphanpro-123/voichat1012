"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Network, Upload, RefreshCw, BookOpen, Zap } from "lucide-react";

interface Topic {
  cluster_id?: number;
  topic_id?: number;
  topic_name?: string;
  topic_label?: string;
  core_phrase?: string;
  items?: Array<{
    word?: string;
    phrase?: string;
    term?: string;
    type?: string;
    importance_score?: number;
  }>;
  item_count?: number;
  size?: number;
}

interface ApiResponse {
  success: boolean;
  topics?: Topic[];
  vocabulary?: any[];
  vocabulary_count?: number;
  detail?: string;
}

export default function TopicModelingDemoPage() {
  const router = useRouter();
  const [documentText, setDocumentText] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSampleText = () => {
    const sampleText = `Machine Learning and Artificial Intelligence

Machine learning is a powerful subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed. Neural networks, inspired by the human brain, form the backbone of modern AI systems. Deep learning algorithms use multiple layers of neural networks to process complex patterns in data.

Climate Change and Environmental Challenges

Climate change represents one of the most pressing global challenges of our time. Rising global temperatures, caused primarily by greenhouse gas emissions, are leading to severe environmental consequences. Deforestation, ocean acidification, and extreme weather events are becoming increasingly common as our planet continues to warm.

Renewable Energy Solutions

The transition to renewable energy sources is crucial for combating climate change. Solar power harnesses energy from sunlight using photovoltaic panels, while wind energy captures kinetic energy through wind turbines. Hydroelectric power and geothermal energy provide additional clean alternatives to fossil fuels. These sustainable technologies are becoming more efficient and cost-effective each year.

Technology for Environmental Protection

Artificial intelligence and machine learning are being deployed to address environmental challenges. Smart grids optimize energy distribution, while AI algorithms help predict weather patterns and climate trends. Satellite monitoring systems track deforestation and pollution levels, providing valuable data for environmental protection efforts.

Sustainable Development and Green Innovation

Sustainable development requires innovative approaches that balance economic growth with environmental protection. Green technologies, including electric vehicles and energy-efficient buildings, are transforming industries worldwide. Circular economy principles promote waste reduction and resource recycling, creating more sustainable production and consumption patterns.`;

    setDocumentText(sampleText);
    setError("");
  };

  const testTopicModeling = async () => {
    if (!documentText.trim()) {
      setError("Vui lòng nhập văn bản hoặc tải sample text");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Create a blob file from text
      const blob = new Blob([documentText], { type: 'text/plain' });
      const file = new File([blob], 'topic_modeling_test.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('max_phrases', '30');
      formData.append('max_words', '20');
      formData.append('generate_flashcards', 'false'); // Focus on topics

      const response = await fetch('/api/proxy/upload-document-complete', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        
        // Save topics to localStorage for vocabulary page
        if (data.topics && data.topics.length > 0) {
          try {
            localStorage.setItem('recent_topics', JSON.stringify(data.topics));
            console.log(" Saved topics to localStorage for vocabulary page");
          } catch (error) {
            console.error("Error saving topics to localStorage:", error);
          }
        }
      } else {
        setError(data.detail || "Đã xảy ra lỗi khi xử lý văn bản");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  const getTopicColor = (index: number) => {
    const colors = [
      'from-blue-50 to-blue-100 border-blue-200',
      'from-green-50 to-green-100 border-green-200', 
      'from-purple-50 to-purple-100 border-purple-200',
      'from-orange-50 to-orange-100 border-orange-200',
      'from-pink-50 to-pink-100 border-pink-200',
      'from-indigo-50 to-indigo-100 border-indigo-200'
    ];
    return colors[index % colors.length];
  };

  const getTopicIcon = (index: number) => {
    const icons = ['', '', '', '', '', ''];
    return icons[index % icons.length];
  };

  return (
    <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              onClick={() => router.push('/dashboard-new')}
              variant="outline"
              size="lg"
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              ← Trang chủ
            </Button>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3 justify-center sm:justify-start">
                <Network className="w-8 h-8 text-blue-600" />
                Topic Modeling Demo
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Thử nghiệm tính năng phân nhóm từ vựng theo chủ đề bằng KMeans Clustering
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-blue-800 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Về Topic Modeling
          </h3>
          <p className="text-sm sm:text-base text-blue-700 leading-relaxed">
            Topic Modeling sử dụng thuật toán <strong>KMeans Clustering</strong> để tự động phân nhóm từ vựng theo chủ đề 
            dựa trên semantic embeddings. Hệ thống sẽ phân tích văn bản, trích xuất từ vựng, và nhóm chúng thành các 
            chủ đề có liên quan về mặt ngữ nghĩa.
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Văn bản đầu vào
            </CardTitle>
            <CardDescription>
              Nhập văn bản tiếng Anh hoặc sử dụng sample text có sẵn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={loadSampleText}
              variant="outline"
              className="w-full"
            >
               Tải Sample Text (AI & Climate Change)
            </Button>
            
            <Textarea
              placeholder="Nhập văn bản tiếng Anh để phân tích..."
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            
            <div className="text-xs text-gray-500">
              Độ dài: {documentText.length} ký tự
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Kết quả phân tích
            </CardTitle>
            <CardDescription>
              Topics và từ vựng được phân nhóm tự động
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={testTopicModeling}
              disabled={loading || !documentText.trim()}
              className="w-full mb-4"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Network className="w-4 h-4 mr-2" />
                  Chạy Topic Modeling
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg border">
                    <div className="text-xl font-bold text-blue-600">
                      {result.topics?.length || 0}
                    </div>
                    <div className="text-xs text-blue-700">Topics</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border">
                    <div className="text-xl font-bold text-green-600">
                      {result.vocabulary_count || 0}
                    </div>
                    <div className="text-xs text-green-700">Từ vựng</div>
                  </div>
                </div>

                {result.topics && result.topics.length > 0 ? (
                  <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-green-700 font-semibold">
                       Topic Modeling hoạt động!
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Đã phân nhóm thành {result.topics.length} chủ đề
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-red-700 font-semibold">
                       Không tìm thấy topics
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      Có thể do không đủ từ vựng hoặc lỗi clustering
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Topics Display */}
      {result && result.topics && result.topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-6 h-6 text-blue-600" />
              Topics được phát hiện ({result.topics.length} chủ đề)
            </CardTitle>
            <CardDescription>
              Từ vựng đã được phân nhóm tự động theo chủ đề bằng KMeans Clustering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.topics.map((topic, index) => (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${getTopicColor(index)} rounded-xl p-4 border-2 hover:shadow-lg transition-shadow`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <span className="text-xl">{getTopicIcon(index)}</span>
                      Topic {index + 1}
                    </h3>
                    <span className="text-xs bg-white bg-opacity-70 px-2 py-1 rounded-full font-medium">
                      {topic.items?.length || topic.item_count || topic.size || 0} từ
                    </span>
                  </div>

                  {/* Topic Name */}
                  {(topic.topic_name || topic.topic_label) && (
                    <div className="mb-3 p-2 bg-white bg-opacity-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700">
                         {topic.topic_name || topic.topic_label}
                      </p>
                    </div>
                  )}

                  {/* Core Phrase */}
                  {topic.core_phrase && (
                    <div className="mb-3 p-2 bg-yellow-100 bg-opacity-70 rounded-lg">
                      <p className="text-xs text-yellow-800">
                         <strong>Từ khóa chính:</strong> {topic.core_phrase}
                      </p>
                    </div>
                  )}

                  {/* Topic Items */}
                  {topic.items && topic.items.length > 0 && (
                    <div className="space-y-2">
                      {/* Phrases */}
                      {topic.items.filter(item => item.type === 'phrase').length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-1">
                             Cụm từ:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {topic.items
                              .filter(item => item.type === 'phrase')
                              .slice(0, 3)
                              .map((item, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded border"
                                >
                                  {item.word || item.phrase || item.term}
                                </span>
                              ))}
                            {topic.items.filter(item => item.type === 'phrase').length > 3 && (
                              <span className="text-xs text-gray-600 px-2 py-1">
                                +{topic.items.filter(item => item.type === 'phrase').length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Words */}
                      {topic.items.filter(item => item.type === 'word').length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-1">
                             Từ đơn:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {topic.items
                              .filter(item => item.type === 'word')
                              .slice(0, 5)
                              .map((item, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded border"
                                >
                                  {item.word || item.phrase || item.term}
                                </span>
                              ))}
                            {topic.items.filter(item => item.type === 'word').length > 5 && (
                              <span className="text-xs text-gray-600 px-2 py-1">
                                +{topic.items.filter(item => item.type === 'word').length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Network className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1"> Cách hoạt động:</p>
                  <p className="text-xs leading-relaxed">
                    1. Hệ thống trích xuất từ vựng từ văn bản<br/>
                    2. Tạo semantic embeddings cho mỗi từ/cụm từ<br/>
                    3. Sử dụng KMeans để phân nhóm dựa trên độ tương đồng ngữ nghĩa<br/>
                    4. Tạo tên chủ đề và xác định từ khóa chính cho mỗi nhóm
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle> Hướng dẫn sử dụng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <p>Nhập văn bản tiếng Anh hoặc click "Tải Sample Text" để sử dụng văn bản mẫu</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <p>Click "Chạy Topic Modeling" để phân tích và phân nhóm từ vựng</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <p>Xem kết quả phân nhóm theo chủ đề và từ vựng được gom nhóm</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <p>Topics sẽ được lưu tự động và hiển thị trong trang "Kho từ vựng" → tab "Chủ đề"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}