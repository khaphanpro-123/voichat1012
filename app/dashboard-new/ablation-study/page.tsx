'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, PlayCircle, CheckCircle2, TrendingUp, Clock, Target } from 'lucide-react';

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
  improvement_from_previous?: number;
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
  };
  results: AblationResult[];
  execution_time: number;
}

export default function AblationStudyPage() {
  const [documentText, setDocumentText] = useState('');
  const [groundTruth, setGroundTruth] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Test Document');
  const [result, setResult] = useState<AblationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL}/api/ablation-study`, {
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
      'bg-gray-100 border-gray-300',
      'bg-blue-50 border-blue-300',
      'bg-green-50 border-green-300',
      'bg-purple-50 border-purple-300',
    ];
    return colors[caseNum] || colors[0];
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ablation Study</h1>
        <p className="text-gray-600">
          Đánh giá hiệu quả của từng thành phần trong pipeline trích xuất từ vựng
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Văn Bản Tài Liệu</CardTitle>
            <CardDescription>Nhập văn bản cần phân tích (tiếng Anh)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Tiêu đề tài liệu"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
            />
            <Textarea
              placeholder="Nhập văn bản tài liệu..."
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Từ Vựng Chuẩn (Ground Truth)</CardTitle>
            <CardDescription>Mỗi từ/cụm từ trên một dòng</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="machine learning&#10;artificial intelligence&#10;algorithm&#10;..."
              value={groundTruth}
              onChange={(e) => setGroundTruth(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 mb-6">
        <Button
          onClick={runAblationStudy}
          disabled={loading}
          size="lg"
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Đang chạy... (40-80 giây)
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-5 w-5" />
              Chạy Ablation Study
            </>
          )}
        </Button>
        
        <Button
          onClick={loadExample}
          variant="outline"
          size="lg"
        >
          Tải Ví Dụ
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-6">
          <Card className="border-2 border-green-500 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Kết Quả Tổng Quan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Best Case</div>
                  <div className="text-lg font-bold text-purple-600">
                    {result.summary.best_case.replace('Case ', 'Case ')}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Best F1-Score</div>
                  <div className={`text-2xl font-bold ${getScoreColor(result.summary.best_f1)}`}>
                    {result.summary.best_f1.toFixed(4)}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-sm text-gray-600 mb-1 flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Improvement
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    +{result.summary.improvement_percent.toFixed(2)}%
                  </div>
                </div>
                
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-sm text-gray-600 mb-1 flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    Total Time
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {result.summary.total_execution_time.toFixed(1)}s
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.results.map((caseResult, index) => (
              <Card key={index} className={`border-2 ${getCaseColor(index)}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{caseResult.case}</span>
                    {caseResult.improvement_from_previous && (
                      <span className="text-sm font-normal text-green-600">
                        +{caseResult.improvement_from_previous.toFixed(2)}%
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {caseResult.description} • Steps: {caseResult.steps}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-white rounded">
                        <div className="text-xs text-gray-600">Precision</div>
                        <div className={`text-lg font-bold ${getScoreColor(caseResult.precision)}`}>
                          {caseResult.precision.toFixed(4)}
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <div className="text-xs text-gray-600">Recall</div>
                        <div className={`text-lg font-bold ${getScoreColor(caseResult.recall)}`}>
                          {caseResult.recall.toFixed(4)}
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <div className="text-xs text-gray-600">F1-Score</div>
                        <div className={`text-lg font-bold ${getScoreColor(caseResult.f1_score)}`}>
                          {caseResult.f1_score.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">TP:</span>
                        <span className="font-semibold">{caseResult.TP}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">FP:</span>
                        <span className="font-semibold">{caseResult.FP}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">FN:</span>
                        <span className="font-semibold">{caseResult.FN}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">Latency:</span>
                        <span className="font-semibold">{caseResult.latency.toFixed(1)}s</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">Diversity:</span>
                        <span className="font-semibold">{caseResult.diversity_index.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded">
                        <span className="text-gray-600">Words:</span>
                        <span className="font-semibold">{caseResult.unique_words}/{caseResult.total_words}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Giải Thích Các Chỉ Số
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Precision (Độ chính xác):</strong> TP/(TP+FP) - Tỷ lệ từ khóa được trích xuất đúng
                </div>
                <div>
                  <strong>Recall (Độ bao phủ):</strong> TP/(TP+FN) - Tỷ lệ từ khóa cần thiết được tìm thấy
                </div>
                <div>
                  <strong>F1-Score:</strong> Trung bình điều hòa giữa Precision và Recall
                </div>
                <div>
                  <strong>Latency:</strong> Thời gian xử lý (giây)
                </div>
                <div>
                  <strong>Diversity Index:</strong> Tỷ lệ từ không trùng lặp
                </div>
                <div>
                  <strong>TP/FP/FN:</strong> True Positive / False Positive / False Negative
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
