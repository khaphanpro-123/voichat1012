'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Play, Bug, Activity } from 'lucide-react';

interface DebugAnalysis {
  step_error: number | number[];
  error_reason: string;
  missing_components: string[];
  how_to_fix: string[];
  sample_correct_payload: string;
  sample_correct_code: string;
  health_check_list: string[];
}

interface PipelineTestResult {
  step: number;
  step_name: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: string;
  execution_time: number;
  data_sample?: any;
}

const DebugDashboard: React.FC = () => {
  const [debugInput, setDebugInput] = useState('');
  const [debugAnalysis, setDebugAnalysis] = useState<DebugAnalysis | null>(null);
  const [pipelineTest, setPipelineTest] = useState<any>(null);
  const [healthCheck, setHealthCheck] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'debug' | 'test' | 'health'>('debug');

  // Run debug analysis
  const runDebugAnalysis = async () => {
    if (!debugInput.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/debug/vision-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          debug_data: {
            error_description: debugInput,
            logs: debugInput,
            step_suspected: 1
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        setDebugAnalysis(result.analysis);
      }
    } catch (error) {
      console.error('Debug analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Run pipeline test
  const runPipelineTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/test-debate-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_type: 'full' })
      });

      const result = await response.json();
      if (result.success) {
        setPipelineTest(result);
      }
    } catch (error) {
      console.error('Pipeline test error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Run health check
  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/vision-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'health_check' })
      });

      const result = await response.json();
      if (result.success) {
        setHealthCheck(result);
      }
    } catch (error) {
      console.error('Health check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
      case true:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAIL':
      case false:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-100 text-green-800';
      case 'FAIL':
        return 'bg-red-100 text-red-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔥 Vision-Debug Master AI Dashboard
        </h1>
        <p className="text-gray-600">
          Comprehensive debugging system for Vision + Debate Mode pipeline
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <Button
          variant={activeTab === 'debug' ? 'default' : 'outline'}
          onClick={() => setActiveTab('debug')}
          className="flex items-center space-x-2"
        >
          <Bug className="w-4 h-4" />
          <span>Debug Analysis</span>
        </Button>
        <Button
          variant={activeTab === 'test' ? 'default' : 'outline'}
          onClick={() => setActiveTab('test')}
          className="flex items-center space-x-2"
        >
          <Play className="w-4 h-4" />
          <span>Pipeline Test</span>
        </Button>
        <Button
          variant={activeTab === 'health' ? 'default' : 'outline'}
          onClick={() => setActiveTab('health')}
          className="flex items-center space-x-2"
        >
          <Activity className="w-4 h-4" />
          <span>Health Check</span>
        </Button>
      </div>

      {/* Debug Analysis Tab */}
      {activeTab === 'debug' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bug className="w-5 h-5" />
                <span>Debug Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Describe your error or paste logs:
                </label>
                <Textarea
                  value={debugInput}
                  onChange={(e) => setDebugInput(e.target.value)}
                  placeholder="Ví dụ: Hệ thống không nhận ra nội dung ảnh, hoặc paste error logs..."
                  rows={4}
                  className="w-full"
                />
              </div>
              <Button 
                onClick={runDebugAnalysis} 
                disabled={loading || !debugInput.trim()}
                className="w-full"
              >
                {loading ? 'Analyzing...' : 'Analyze Debug Issue'}
              </Button>
            </CardContent>
          </Card>

          {debugAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>Debug Analysis Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Error Step(s):</h4>
                    <Badge variant="destructive">
                      Step {Array.isArray(debugAnalysis.step_error) 
                        ? debugAnalysis.step_error.join(', ') 
                        : debugAnalysis.step_error}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Error Reason:</h4>
                    <p className="text-sm text-gray-600">{debugAnalysis.error_reason}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Missing Components:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {debugAnalysis.missing_components.map((component, index) => (
                      <li key={index} className="text-sm text-gray-600">{component}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">How to Fix:</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {debugAnalysis.how_to_fix.map((fix, index) => (
                      <li key={index} className="text-sm text-gray-600">{fix}</li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Sample Correct Code:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                    {debugAnalysis.sample_correct_code}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Health Check List:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {debugAnalysis.health_check_list.map((check, index) => (
                      <li key={index} className="text-sm text-gray-600">{check}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pipeline Test Tab */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="w-5 h-5" />
                <span>Pipeline Test</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={runPipelineTest} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Run Full Pipeline Test'}
              </Button>
            </CardContent>
          </Card>

          {pipelineTest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pipeline Test Results</span>
                  <Badge className={getStatusColor(pipelineTest.overall_status)}>
                    {pipelineTest.overall_status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {pipelineTest.steps_passed}
                    </div>
                    <div className="text-sm text-gray-600">Steps Passed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {pipelineTest.steps_failed}
                    </div>
                    <div className="text-sm text-gray-600">Steps Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {pipelineTest.total_execution_time}ms
                    </div>
                    <div className="text-sm text-gray-600">Total Time</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Step Results:</h4>
                  {pipelineTest.pipeline_results?.map((result: PipelineTestResult) => (
                    <div key={result.step} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="font-medium">Step {result.step}: {result.step_name}</div>
                          <div className="text-sm text-gray-600">{result.details}</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {result.execution_time}ms
                      </div>
                    </div>
                  ))}
                </div>

                {pipelineTest.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {pipelineTest.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Health Check Tab */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>System Health Check</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={runHealthCheck} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Checking...' : 'Run Health Check'}
              </Button>
            </CardContent>
          </Card>

          {healthCheck && (
            <Card>
              <CardHeader>
                <CardTitle>Health Check Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(healthCheck.pipeline_status || {}).map(([key, status]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      {getStatusIcon(status as string)}
                    </div>
                  ))}
                </div>

                {healthCheck.issues_found?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Issues Found:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {healthCheck.issues_found.map((issue: string, index: number) => (
                        <li key={index} className="text-sm text-red-600">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {healthCheck.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {healthCheck.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugDashboard;