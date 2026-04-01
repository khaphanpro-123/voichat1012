'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AblationResult {
  case: string;
  steps: string;
  description: string;
  TP: number;
  FP: number;
  FN: number;
  precision: number;
  recall: number;
  f1_score: number;
  latency: number;
  diversity_index: number;
  total_words: number;
  unique_words: number;
  pipeline_complexity: string;
  improvement_from_previous?: number;
}

interface ThesisCompliance {
  case_naming: string;
  step_count: string;
  different_results: string;
  progressive_improvement: string;
  pipeline_architecture: string;
  version: string;
}

interface AblationResponse {
  success: boolean;
  summary: {
    best_case: string;
    best_f1: number;
    baseline_f1: number;
    improvement_percent: number;
    total_execution_time: number;
    ground_truth_size: number;
    configurations_tested: number;
  };
  results: AblationResult[];
  execution_time: number;
  thesis_compliance: ThesisCompliance;
}

export default function AblationStudyPage() {
  const router = useRouter();
  const [documentText, setDocumentText] = useState('');
  const [groundTruth, setGroundTruth] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Test Document');
  const [result, setResult] = useState<AblationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractingVocab, setExtractingVocab] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const loadExample = () => {
    setDocumentText(`Machine Learning and Artificial Intelligence

Machine learning is a subset of artificial intelligence that focuses on developing algorithms that can learn from data. Neural networks are a fundamental component of modern machine learning systems.

Deep Learning

Deep learning uses neural networks with multiple layers to process complex patterns. Backpropagation is the key algorithm for training these networks. Gradient descent optimization helps minimize the loss function.

Applications

Machine learning has numerous applications including natural language processing, computer vision, and reinforcement learning. These technologies are transforming industries worldwide.`);
    
    setGroundTruth(`machine learning
artificial intelligence
neural network
deep learning
algorithm
backpropagation
gradient descent
natural language processing
computer vision
reinforcement learning`);
    
    setDocumentTitle('Machine Learning Introduction');
    setUploadedFile(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setDocumentTitle(file.name.replace(/\.[^/.]+$/, ''));
    setError('');

    // Chỉ hỗ trợ .txt file cho việc đọc trực tiếp
    // Các file khác (.pdf, .docx) cần gửi lên backend để xử lý
    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDocumentText(text);
      };
      reader.readAsText(file);
    } else {
      // Với PDF/DOCX, gửi lên backend để extract text
      setError('Đang xử lý file... Vui lòng đợi');
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('max_phrases', '1'); // Chỉ cần extract text
        formData.append('max_words', '1');

        const response = await fetch(`/api/proxy/upload-document-complete`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Lấy text từ response (backend đã extract)
        // Backend trả về text trong metadata hoặc có thể reconstruct từ vocabulary
        if (data.success) {
          // Tạm thời set message để user biết file đã upload
          setDocumentText(`File "${file.name}" đã được tải lên.\n\nVui lòng click "Tự Động Trích Xuất Từ Vựng" để xử lý file này.`);
          setError('');
        } else {
          throw new Error('Không thể xử lý file');
        }
      } catch (err) {
        setError('Lỗi khi xử lý file. Vui lòng thử file .txt hoặc copy/paste nội dung.');
        console.error('Error:', err);
      }
    }
  };

  const autoExtractVocabulary = async () => {
    if (!uploadedFile && !documentText.trim()) {
      setError('Vui lòng nhập văn bản hoặc tải file lên trước');
      return;
    }

    setExtractingVocab(true);
    setError('');

    try {
      const formData = new FormData();
      
      // Nếu có file đã upload, dùng file đó
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      } else {
        // Nếu không, tạo file blob từ text
        const blob = new Blob([documentText], { type: 'text/plain' });
        const file = new File([blob], documentTitle + '.txt', { type: 'text/plain' });
        formData.append('file', file);
      }
      
      formData.append('max_phrases', '30');
      formData.append('max_words', '20');

      const response = await fetch(`/api/proxy/upload-document-complete`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success && data.vocabulary) {
        // Trích xuất từ vựng từ kết quả
        const extractedVocab = data.vocabulary
          .map((item: any) => item.word || item.phrase || item.text)
          .filter((word: string) => word && word.trim())
          .slice(0, 50); // Lấy top 50 từ
        
        setGroundTruth(extractedVocab.join('\n'));
        setError('');
        
        // Nếu có file PDF/DOCX, cập nhật document text từ extracted text
        if (uploadedFile && !uploadedFile.name.endsWith('.txt')) {
          // Reconstruct text từ vocabulary contexts
          const contexts = data.vocabulary
            .map((item: any) => item.context_sentence || item.supporting_sentence || '')
            .filter((s: string) => s.trim())
            .slice(0, 20);
          
          if (contexts.length > 0) {
            setDocumentText(contexts.join('\n\n'));
          }
        }
      } else {
        throw new Error('Không thể trích xuất từ vựng');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi trích xuất từ vựng');
      console.error('Error:', err);
    } finally {
      setExtractingVocab(false);
    }
  };

  const runAblationStudy = async () => {
    if (!documentText.trim()) {
      setError('Vui lòng nhập văn bản tài liệu');
      return;
    }

    if (!groundTruth.trim()) {
      setError('Vui lòng nhập danh sách từ vựng chuẩn');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const groundTruthArray = groundTruth
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const response = await fetch(`/api/proxy/ablation-study`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_text: documentText,
          ground_truth_vocabulary: groundTruthArray,
          document_title: documentTitle,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi chạy ablation study');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCaseColor = (caseNum: number) => {
    const colors = [
      'bg-blue-50 border-blue-300',      // TH1: Extraction Module
      'bg-green-50 border-green-300',    // TH2: + Structural Context  
      'bg-orange-50 border-orange-300',  // TH3: + Score Normalization
      'bg-purple-50 border-purple-300',  // TH4: Full System
    ];
    return colors[caseNum] || colors[0];
  };

  const getCaseIcon = (caseNum: number) => {
    // Removed icons as requested by user
    return '';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const analyzeScore = (score: number, metric: string, caseIndex: number) => {
    const caseNames = ['TH1', 'TH2', 'TH3', 'TH4'];
    const caseName = caseNames[caseIndex];
    
    if (metric === 'precision') {
      if (score >= 0.9) {
        return `${caseName} đạt precision ${score.toFixed(4)} - Xuất sắc! Hệ thống trích xuất rất chính xác với tỷ lệ từ vựng đúng trên 90%. Điều này có nghĩa là trong số các từ vựng được hệ thống trích xuất, hơn 90% là từ vựng thực sự quan trọng và phù hợp với nội dung tài liệu.`;
      } else if (score >= 0.7) {
        return `${caseName} đạt precision ${score.toFixed(4)} - Tốt. Hệ thống có độ chính xác cao với ${(score*100).toFixed(1)}% từ vựng được trích xuất là chính xác. Vẫn có một số từ vựng không liên quan nhưng ở mức chấp nhận được.`;
      } else if (score >= 0.5) {
        return `${caseName} đạt precision ${score.toFixed(4)} - Trung bình. Chỉ có ${(score*100).toFixed(1)}% từ vựng được trích xuất là chính xác. Hệ thống cần cải thiện khả năng lọc để giảm từ vựng nhiễu.`;
      } else {
        return `${caseName} đạt precision ${score.toFixed(4)} - Thấp. Chỉ ${(score*100).toFixed(1)}% từ vựng trích xuất là đúng, có quá nhiều từ vựng sai hoặc không liên quan. Cần cải thiện đáng kể thuật toán filtering.`;
      }
    } else if (metric === 'recall') {
      if (score >= 0.8) {
        return `${caseName} đạt recall ${score.toFixed(4)} - Xuất sắc! Hệ thống tìm thấy ${(score*100).toFixed(1)}% từ vựng quan trọng trong tài liệu. Khả năng bao phủ rất tốt, ít bỏ sót từ vựng cần thiết.`;
      } else if (score >= 0.6) {
        return `${caseName} đạt recall ${score.toFixed(4)} - Tốt. Hệ thống bắt được ${(score*100).toFixed(1)}% từ vựng quan trọng. Vẫn bỏ sót một số từ vựng nhưng đã cover được phần lớn nội dung cần thiết.`;
      } else if (score >= 0.4) {
        return `${caseName} đạt recall ${score.toFixed(4)} - Trung bình. Chỉ tìm thấy ${(score*100).toFixed(1)}% từ vựng quan trọng, bỏ sót khá nhiều từ vựng cần thiết. Cần mở rộng coverage của hệ thống.`;
      } else {
        return `${caseName} đạt recall ${score.toFixed(4)} - Thấp. Chỉ phát hiện được ${(score*100).toFixed(1)}% từ vựng quan trọng, bỏ sót quá nhiều. Hệ thống cần cải thiện khả năng nhận diện từ vựng.`;
      }
    } else if (metric === 'f1') {
      if (score >= 0.8) {
        return `${caseName} đạt F1-Score ${score.toFixed(4)} - Xuất sắc! Cân bằng tốt giữa precision (${score >= 0.9 ? 'rất cao' : 'cao'}) và recall (${score >= 0.8 ? 'tốt' : 'khá tốt'}). Hiệu suất tổng thể rất ấn tượng.`;
      } else if (score >= 0.6) {
        return `${caseName} đạt F1-Score ${score.toFixed(4)} - Tốt. Hiệu suất tổng thể ổn định với sự cân bằng hợp lý giữa độ chính xác và độ bao phủ. Phù hợp cho ứng dụng thực tế.`;
      } else if (score >= 0.4) {
        return `${caseName} đạt F1-Score ${score.toFixed(4)} - Trung bình. Hiệu suất chưa tối ưu, cần cải thiện cả precision và recall để đạt được chất lượng tốt hơn.`;
      } else {
        return `${caseName} đạt F1-Score ${score.toFixed(4)} - Thấp. Hiệu suất tổng thể cần cải thiện đáng kể. Cả precision và recall đều ở mức thấp, cần tối ưu hóa toàn bộ pipeline.`;
      }
    }
    return `${caseName}: ${metric} ${score.toFixed(4)}`;
  };

  return (
    <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
      {/* Header với nút quay về */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              onClick={() => router.push('/dashboard-new')}
              variant="outline"
              size="lg"
              className="flex items-center justify-center gap-2 text-sm sm:text-base lg:text-lg px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto"
            >
              ← Trang chủ
            </Button>
            <div className="hidden sm:block h-8 w-px bg-gray-300"></div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900 mb-1 sm:mb-2">Ablation Study Analysis</h1>
              <p className="text-sm sm:text-base lg:text-xl text-gray-600">
                Đánh giá hiệu quả từng thành phần trong pipeline 8 bước đơn giản hóa
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-8">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-800 mb-4 sm:mb-6 text-center sm:text-left">
            Hướng dẫn đọc kết quả Ablation Study (Pipeline 8 Bước)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <div>
              <h4 className="font-semibold text-blue-700 mb-3 sm:mb-4 text-base sm:text-lg lg:text-xl">Cách tính các chỉ số:</h4>
              <div className="space-y-2 sm:space-y-3 lg:space-y-4 text-blue-700">
                <div className="bg-white p-3 sm:p-4 rounded-lg border">
                  <strong className="text-sm sm:text-base lg:text-lg block mb-1">Precision (Độ chính xác):</strong>
                  <span className="text-xs sm:text-sm lg:text-base">TP/(TP+FP) - Tỷ lệ từ vựng được trích xuất đúng so với tổng số từ được trích xuất</span>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border">
                  <strong className="text-sm sm:text-base lg:text-lg block mb-1">Recall (Độ bao phủ):</strong>
                  <span className="text-xs sm:text-sm lg:text-base">TP/(TP+FN) - Tỷ lệ từ vựng quan trọng được tìm thấy so với tổng từ vựng cần thiết</span>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border">
                  <strong className="text-sm sm:text-base lg:text-lg block mb-1">F1-Score:</strong>
                  <span className="text-xs sm:text-sm lg:text-base">2×(Precision×Recall)/(Precision+Recall) - Chỉ số tổng hợp cân bằng giữa độ chính xác và độ bao phủ</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700 mb-3 sm:mb-4 text-base sm:text-lg lg:text-xl">Cấu hình các trường hợp (Pipeline 8 Bước):</h4>
              <div className="space-y-2 sm:space-y-3 lg:space-y-4 text-blue-700">
                <div className="bg-white p-3 sm:p-4 rounded-lg border">
                  <strong className="text-sm sm:text-base lg:text-lg block mb-1">TH1 - Extraction Module:</strong>
                  <span className="text-xs sm:text-sm lg:text-base">Bước 1,3,4,5 - Trích xuất cơ bản: Phrases (2 features) + Words (4 features)</span>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border">
                  <strong className="text-sm sm:text-base lg:text-lg block mb-1">TH2 - + Structural Context:</strong>
                  <span className="text-xs sm:text-sm lg:text-base">Bước 1,2,3,4,5 - Thêm phân tích cấu trúc tiêu đề</span>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border">
                  <strong className="text-sm sm:text-base lg:text-lg block mb-1">TH3 - + Score Normalization:</strong>
                  <span className="text-xs sm:text-sm lg:text-base">Bước 1-6 - Thêm chuẩn hóa điểm số</span>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border">
                  <strong className="text-sm sm:text-base lg:text-lg block mb-1">TH4 - Full System:</strong>
                  <span className="text-xs sm:text-sm lg:text-base">Bước 1-8 - Hệ thống hoàn chỉnh với Topic Modeling</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg lg:text-xl">
              Văn Bản Tài Liệu
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm lg:text-base">
              Tải file .txt lên (khuyến nghị) hoặc nhập văn bản (tiếng Anh)
              <br />
              <span className="text-orange-600 font-medium">
                Lưu ý: File .pdf/.docx cần click "Tự Động Trích Xuất" để xử lý
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6">
            <Input
              placeholder="Tiêu đề tài liệu"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="text-sm sm:text-base lg:text-lg p-2 sm:p-3 lg:p-4"
            />
            
            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="lg"
                className="flex-1 text-xs sm:text-sm lg:text-base break-words"
              >
                {uploadedFile ? uploadedFile.name : 'Tải File Lên (.txt khuyến nghị)'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <Textarea
              placeholder="Hoặc nhập văn bản tài liệu..."
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              className="min-h-[250px] sm:min-h-[300px] lg:min-h-[350px] font-mono text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4"
            />
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg lg:text-xl">
              Từ Vựng Chuẩn (Ground Truth)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm lg:text-base">Tự động trích xuất hoặc nhập thủ công</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6">
            <Button
              onClick={autoExtractVocabulary}
              disabled={extractingVocab || !documentText.trim()}
              variant="outline"
              size="lg"
              className="w-full text-xs sm:text-sm lg:text-base"
            >
              {extractingVocab ? (
                <>
                  Đang trích xuất từ vựng...
                </>
              ) : (
                <>
                  Tự Động Trích Xuất Từ Vựng
                </>
              )}
            </Button>

            <Textarea
              placeholder="machine learning&#10;artificial intelligence&#10;algorithm&#10;...&#10;&#10;Hoặc click 'Tự Động Trích Xuất' để hệ thống tự động tạo"
              value={groundTruth}
              onChange={(e) => setGroundTruth(e.target.value)}
              className="min-h-[250px] sm:min-h-[300px] lg:min-h-[350px] font-mono text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4"
            />
            
            <div className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium">
              {groundTruth.split('\n').filter(l => l.trim()).length} từ vựng
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <Button
          onClick={runAblationStudy}
          disabled={loading}
          size="lg"
          className="flex-1 text-sm sm:text-base lg:text-lg py-3 sm:py-4 lg:py-6"
        >
          {loading ? (
            <>
              Đang chạy TH1-TH4... (60-120 giây)
            </>
          ) : (
            <>
              Chạy Ablation Study (TH1-TH4)
            </>
          )}
        </Button>
        
        <Button
          onClick={loadExample}
          variant="outline"
          size="lg"
          className="text-sm sm:text-base lg:text-lg py-3 sm:py-4 lg:py-6 w-full sm:w-auto"
        >
          Tải Ví Dụ
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 sm:mb-6 lg:mb-8 text-sm sm:text-base lg:text-lg p-4 sm:p-5 lg:p-6">
          <AlertDescription className="text-xs sm:text-sm lg:text-base break-words">{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          <Card className="border-2 border-green-500 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-center sm:text-left">
                Thesis Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="text-sm sm:text-base lg:text-lg font-medium">Case Naming:</span>
                    <span className="text-sm sm:text-base lg:text-lg text-green-600 font-semibold break-words">{result.thesis_compliance?.case_naming}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="text-sm sm:text-base lg:text-lg font-medium">Step Count:</span>
                    <span className="text-sm sm:text-base lg:text-lg text-green-600 font-semibold break-words">{result.thesis_compliance?.step_count}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="text-sm sm:text-base lg:text-lg font-medium">Architecture:</span>
                    <span className="text-sm sm:text-base lg:text-lg text-green-600 font-semibold break-words">{result.thesis_compliance?.pipeline_architecture}</span>
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="text-sm sm:text-base lg:text-lg font-medium">Different Results:</span>
                    <span className="text-sm sm:text-base lg:text-lg text-green-600 font-semibold break-words">{result.thesis_compliance?.different_results}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="text-sm sm:text-base lg:text-lg font-medium">Progressive Improvement:</span>
                    <span className="text-sm sm:text-base lg:text-lg text-green-600 font-semibold break-words">{result.thesis_compliance?.progressive_improvement}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="text-sm sm:text-base lg:text-lg font-medium">Version:</span>
                    <span className="text-sm sm:text-base lg:text-lg text-green-600 font-semibold break-words">{result.thesis_compliance?.version}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-center sm:text-left">
                Kết Quả Tổng Quan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                  <div className="text-center p-3 sm:p-4 lg:p-6 bg-white rounded-lg sm:rounded-xl border-2">
                    <div className="text-xs sm:text-sm lg:text-lg text-gray-600 mb-1 sm:mb-2">Best Configuration</div>
                    <div className="text-base sm:text-xl lg:text-2xl font-bold text-purple-600 break-words">
                      {result.summary.best_case.replace('TH', 'TH').split(':')[0]}
                    </div>
                  </div>
                
                <div className="text-center p-3 sm:p-4 lg:p-6 bg-white rounded-lg sm:rounded-xl border-2">
                  <div className="text-xs sm:text-sm lg:text-lg text-gray-600 mb-1 sm:mb-2">Best F1-Score</div>
                  <div className={`text-lg sm:text-2xl lg:text-3xl font-bold ${getScoreColor(result.summary.best_f1)}`}>
                    {result.summary.best_f1.toFixed(4)}
                  </div>
                </div>
                
                <div className="text-center p-3 sm:p-4 lg:p-6 bg-white rounded-lg sm:rounded-xl border-2">
                  <div className="text-xs sm:text-sm lg:text-lg text-gray-600 mb-1 sm:mb-2">
                    Improvement
                  </div>
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-green-600">
                    +{result.summary.improvement_percent.toFixed(2)}%
                  </div>
                </div>
                
                <div className="text-center p-3 sm:p-4 lg:p-6 bg-white rounded-lg sm:rounded-xl border-2">
                  <div className="text-xs sm:text-sm lg:text-lg text-gray-600 mb-1 sm:mb-2">
                    Total Time
                  </div>
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-600">
                    {result.summary.total_execution_time.toFixed(1)}s
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {result.results.map((caseResult, index) => (
              <Card key={index} className={`border-2 ${getCaseColor(index)}`}>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg lg:text-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-base sm:text-lg lg:text-xl break-words">{caseResult.case}</span>
                    </div>
                    {caseResult.improvement_from_previous && (
                      <span className="text-sm sm:text-base lg:text-lg font-normal text-green-600">
                        +{caseResult.improvement_from_previous.toFixed(2)}%
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm lg:text-base break-words">
                    {caseResult.description} • Steps: {caseResult.steps}
                    <br />
                    <span className="text-blue-600 font-medium">
                      Pipeline: {caseResult.pipeline_complexity}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                      <div className="p-2 sm:p-3 lg:p-4 bg-white rounded-lg border">
                        <div className="text-xs sm:text-sm lg:text-base text-gray-600 mb-1">Precision</div>
                        <div className={`text-sm sm:text-lg lg:text-2xl font-bold ${getScoreColor(caseResult.precision)}`}>
                          {caseResult.precision.toFixed(4)}
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 lg:p-4 bg-white rounded-lg border">
                        <div className="text-xs sm:text-sm lg:text-base text-gray-600 mb-1">Recall</div>
                        <div className={`text-sm sm:text-lg lg:text-2xl font-bold ${getScoreColor(caseResult.recall)}`}>
                          {caseResult.recall.toFixed(4)}
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 lg:p-4 bg-white rounded-lg border">
                        <div className="text-xs sm:text-sm lg:text-base text-gray-600 mb-1">F1-Score</div>
                        <div className={`text-sm sm:text-lg lg:text-2xl font-bold ${getScoreColor(caseResult.f1_score)}`}>
                          {caseResult.f1_score.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm lg:text-base">
                      <div className="flex justify-between p-2 sm:p-3 bg-white rounded-lg border">
                        <span className="text-gray-600 font-medium">TP:</span>
                        <span className="font-bold">{caseResult.TP}</span>
                      </div>
                      <div className="flex justify-between p-2 sm:p-3 bg-white rounded-lg border">
                        <span className="text-gray-600 font-medium">FP:</span>
                        <span className="font-bold">{caseResult.FP}</span>
                      </div>
                      <div className="flex justify-between p-2 sm:p-3 bg-white rounded-lg border">
                        <span className="text-gray-600 font-medium">FN:</span>
                        <span className="font-bold">{caseResult.FN}</span>
                      </div>
                      <div className="flex justify-between p-2 sm:p-3 bg-white rounded-lg border">
                        <span className="text-gray-600 font-medium">Latency:</span>
                        <span className="font-bold">{caseResult.latency.toFixed(1)}s</span>
                      </div>
                      <div className="flex justify-between p-2 sm:p-3 bg-white rounded-lg border">
                        <span className="text-gray-600 font-medium">Diversity:</span>
                        <span className="font-bold">{caseResult.diversity_index.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between p-2 sm:p-3 bg-white rounded-lg border">
                        <span className="text-gray-600 font-medium">Words:</span>
                        <span className="font-bold">{caseResult.unique_words}/{caseResult.total_words}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Phân tích chi tiết từng chỉ số */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-center sm:text-left">
                Phân Tích Chi Tiết Từng Chỉ Số
              </CardTitle>
              <CardDescription className="text-sm sm:text-base lg:text-lg">
                Giải thích cụ thể ý nghĩa của từng chỉ số đo lường cho mỗi trường hợp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                {result.results.map((caseResult, index) => (
                  <div key={index} className={`p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl border-2 ${getCaseColor(index)}`}>
                    <h4 className="text-base sm:text-lg lg:text-2xl font-bold mb-3 sm:mb-4 lg:mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <span className="break-words">{caseResult.case}</span>
                      <span className="text-sm sm:text-base lg:text-lg font-normal text-gray-600">
                        ({caseResult.pipeline_complexity})
                      </span>
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                      {/* Precision Analysis */}
                      <div className="p-3 sm:p-4 lg:p-5 bg-white rounded-lg border-2 border-blue-200">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <h5 className="text-sm sm:text-base lg:text-xl font-bold text-blue-600">Precision</h5>
                          <span className={`text-base sm:text-xl lg:text-2xl font-bold ${getScoreColor(caseResult.precision)}`}>
                            {caseResult.precision.toFixed(4)}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed break-words">
                          {analyzeScore(caseResult.precision, 'precision', index)}
                        </div>
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-50 rounded text-xs sm:text-sm break-words">
                          <strong>Công thức:</strong> {caseResult.TP}/({caseResult.TP}+{caseResult.FP}) = {caseResult.TP}/{caseResult.TP + caseResult.FP} = {caseResult.precision.toFixed(4)}
                        </div>
                      </div>

                      {/* Recall Analysis */}
                      <div className="p-3 sm:p-4 lg:p-5 bg-white rounded-lg border-2 border-green-200">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <h5 className="text-sm sm:text-base lg:text-xl font-bold text-green-600">Recall</h5>
                          <span className={`text-base sm:text-xl lg:text-2xl font-bold ${getScoreColor(caseResult.recall)}`}>
                            {caseResult.recall.toFixed(4)}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed break-words">
                          {analyzeScore(caseResult.recall, 'recall', index)}
                        </div>
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-green-50 rounded text-xs sm:text-sm break-words">
                          <strong>Công thức:</strong> {caseResult.TP}/({caseResult.TP}+{caseResult.FN}) = {caseResult.TP}/{caseResult.TP + caseResult.FN} = {caseResult.recall.toFixed(4)}
                        </div>
                      </div>

                      {/* F1-Score Analysis */}
                      <div className="p-3 sm:p-4 lg:p-5 bg-white rounded-lg border-2 border-purple-200">
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <h5 className="text-sm sm:text-base lg:text-xl font-bold text-purple-600">F1-Score</h5>
                          <span className={`text-base sm:text-xl lg:text-2xl font-bold ${getScoreColor(caseResult.f1_score)}`}>
                            {caseResult.f1_score.toFixed(4)}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed break-words">
                          {analyzeScore(caseResult.f1_score, 'f1', index)}
                        </div>
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-purple-50 rounded text-xs sm:text-sm break-words">
                          <strong>Công thức:</strong> 2×({caseResult.precision.toFixed(3)}×{caseResult.recall.toFixed(3)})/({caseResult.precision.toFixed(3)}+{caseResult.recall.toFixed(3)}) = {caseResult.f1_score.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    {/* Additional Metrics */}
                    <div className="mt-3 sm:mt-4 lg:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                      <div className="p-2 sm:p-3 lg:p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-800">{caseResult.latency.toFixed(1)}s</div>
                        <div className="text-xs sm:text-sm text-gray-600">Thời gian xử lý</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {caseResult.latency < 30 ? 'Nhanh' : caseResult.latency < 60 ? 'Trung bình' : 'Chậm'}
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 lg:p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-800">{caseResult.diversity_index.toFixed(4)}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Diversity Index</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {caseResult.diversity_index > 0.8 ? 'Đa dạng cao' : caseResult.diversity_index > 0.6 ? 'Đa dạng vừa' : 'Đa dạng thấp'}
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 lg:p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-800">{caseResult.unique_words}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Từ vựng duy nhất</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Trên tổng {caseResult.total_words} từ
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 lg:p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-800">
                          {caseResult.improvement_from_previous ? `+${caseResult.improvement_from_previous.toFixed(1)}%` : 'Baseline'}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Cải thiện</div>
                        <div className="text-xs text-gray-500 mt-1">
                          So với TH trước
                        </div>
                      </div>
                    </div>

                    {/* Technical Details */}
                    <div className="mt-3 sm:mt-4 lg:mt-6 p-3 sm:p-4 bg-gray-100 rounded-lg">
                      <h6 className="text-sm sm:text-base lg:text-lg font-semibold mb-2">Chi tiết kỹ thuật:</h6>
                      <div className="text-xs sm:text-sm lg:text-base text-gray-700 break-words">
                        <span className="font-medium">Bước pipeline:</span> {caseResult.steps} • 
                        <span className="font-medium">TP:</span> {caseResult.TP} từ đúng • 
                        <span className="font-medium">FP:</span> {caseResult.FP} từ sai • 
                        <span className="font-medium">FN:</span> {caseResult.FN} từ bỏ sót • 
                        <span className="font-medium">Complexity:</span> {caseResult.pipeline_complexity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-center sm:text-left">
                Cấu Hình Pipeline 8 Bước
              </CardTitle>
              <CardDescription className="text-sm sm:text-base lg:text-lg">
                Chi tiết các bước xử lý trong từng trường hợp thử nghiệm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h4 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 text-blue-600 text-center sm:text-left">
                    Evaluation Metrics
                  </h4>
                  <div className="space-y-2 sm:space-y-3 lg:space-y-4 text-xs sm:text-sm lg:text-base">
                    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                      <strong className="text-sm sm:text-base lg:text-lg block mb-1">Precision (Độ chính xác):</strong>
                      <span className="text-gray-700 break-words">TP/(TP+FP) - Tỷ lệ từ khóa được trích xuất đúng. Cao = ít nhiễu, thấp = nhiều từ sai.</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
                      <strong className="text-sm sm:text-base lg:text-lg block mb-1">Recall (Độ bao phủ):</strong>
                      <span className="text-gray-700 break-words">TP/(TP+FN) - Tỷ lệ từ khóa quan trọng được tìm thấy. Cao = đầy đủ, thấp = thiếu sót.</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border-l-4 border-purple-500">
                      <strong className="text-sm sm:text-base lg:text-lg block mb-1">F1-Score:</strong>
                      <span className="text-gray-700 break-words">Trung bình điều hòa Precision và Recall - Chỉ số tổng hợp quan trọng nhất để đánh giá chất lượng tổng thể.</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border-l-4 border-orange-500">
                      <strong className="text-sm sm:text-base lg:text-lg block mb-1">Latency:</strong>
                      <span className="text-gray-700 break-words">Thời gian xử lý (giây) - Đánh giá tính khả thi khi ứng dụng vào thực tế.</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 text-purple-600 text-center sm:text-left">
                    Thesis Configuration
                  </h4>
                  <div className="space-y-2 sm:space-y-3 lg:space-y-4 text-xs sm:text-sm lg:text-base">
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <strong className="text-sm sm:text-base lg:text-lg block mb-1">TH1 - Extraction Module:</strong>
                      <span className="text-gray-700 break-words">Bước 1,3,4,5 - Trích xuất cơ bản: Phrases (TF-IDF + Cohesion) + Words (TF-IDF + Length + Morph + Coverage)</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <strong className="text-sm sm:text-base lg:text-lg block mb-1">TH2 - + Structural Context:</strong>
                      <span className="text-gray-700 break-words">Bước 1,2,3,4,5 - Thêm phân tích tiêu đề và ánh xạ ngữ cảnh cấu trúc</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                      <strong className="text-sm sm:text-base lg:text-lg block mb-1">TH3 - + Score Normalization:</strong>
                      <span className="text-gray-700 break-words">Bước 1-6 - Thêm chuẩn hóa điểm số (Min-Max Scaling + Ranking)</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                      <strong className="text-sm sm:text-base lg:text-lg block mb-1">TH4 - Full System:</strong>
                      <span className="text-gray-700 break-words">Bước 1-8 - Hệ thống hoàn chỉnh với Topic Modeling (KMeans) và Flashcard Generation</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
