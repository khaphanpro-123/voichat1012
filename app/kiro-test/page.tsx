'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Play, Bug, Zap } from 'lucide-react';

const KiroTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState<string>('complete');

  const runVisionErrorCheck = async (checkType: string = 'complete') => {
    setLoading(true);
    setTestType(checkType);
    
    try {
      const response = await fetch('/api/debug/vision-error-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_type: checkType })
      });

      const result = await response.json();
      setTestResults(result);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ error: 'Test execution failed' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string | boolean) => {
    if (status === 'ok' || status === true) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (status === 'error' || status === false) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusColor = (status: string | boolean) => {
    if (status === 'ok' || status === true) {
      return 'bg-green-100 text-green-800';
    } else if (status === 'error' || status === false) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔥 KIRO Vision Error Checker
        </h1>
        <p className="text-gray-600">
          100% Comprehensive Debate Mode Analysis System
        </p>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Automated Testing Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button 
              onClick={() => runVisionErrorCheck('complete')}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Complete Check</span>
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => runVisionErrorCheck('vision_only')}
              disabled={loading}
            >
              Vision Only
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => runVisionErrorCheck('ui_only')}
              disabled={loading}
            >
              UI Only
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => runVisionErrorCheck('backend_only')}
              disabled={loading}
            >
              Backend Only
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => runVisionErrorCheck('payload_only')}
              disabled={loading}
            >
              Payload Only
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => runVisionErrorCheck('hardcode_only')}
              disabled={loading}
            >
              Hardcode Only
            </Button>
          </div>
          
          {loading && (
            <div className="text-center py-4">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Running {testType} analysis...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && !testResults.error && (
        <div className="space-y-6">
          
          {/* I. Vision Model Check */}
          {testResults.vision_check && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>I. Vision Model Check</span>
                  <Badge className={getStatusColor(testResults.vision_check.vision_status)}>
                    {testResults.vision_check.vision_status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.vision_check.vision_status === 'error' && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-red-600">Reason:</h4>
                      <p className="text-sm">{testResults.vision_check.reason}</p>
                    </div>
                    
                    {testResults.vision_check.missing_steps && (
                      <div>
                        <h4 className="font-semibold">Missing Steps:</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {testResults.vision_check.missing_steps.map((step: string, index: number) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {testResults.vision_check.how_to_fix && (
                      <div>
                        <h4 className="font-semibold">How to Fix:</h4>
                        <ol className="list-decimal list-inside text-sm space-y-1">
                          {testResults.vision_check.how_to_fix.map((fix: string, index: number) => (
                            <li key={index}>{fix}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
                
                {testResults.vision_check.vision_status === 'ok' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>Vision Model integration is working correctly</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* II. UI Issues Check */}
          {testResults.ui_check && (
            <Card>
              <CardHeader>
                <CardTitle>II. UI Issues Check</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span>Hardcode Found:</span>
                    {getStatusIcon(!testResults.ui_check.hardcode_found)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>API Response Received:</span>
                    {getStatusIcon(testResults.ui_check.api_response_received)}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold">UI Issue:</h4>
                  <p className="text-sm">{testResults.ui_check.ui_issue}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Required Fix:</h4>
                  <p className="text-sm">{testResults.ui_check.required_fix}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* III. Backend Issues Check */}
          {testResults.backend_check && (
            <Card>
              <CardHeader>
                <CardTitle>III. Backend API Check</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {testResults.backend_check.missing_api.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-600">Missing APIs:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {testResults.backend_check.missing_api.map((api: string, index: number) => (
                        <li key={index}>{api}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {testResults.backend_check.backend_issue.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-yellow-600">Backend Issues:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {testResults.backend_check.backend_issue.map((issue: string, index: number) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {testResults.backend_check.required_fix.length > 0 && (
                  <div>
                    <h4 className="font-semibold">Required Fixes:</h4>
                    <ol className="list-decimal list-inside text-sm">
                      {testResults.backend_check.required_fix.map((fix: string, index: number) => (
                        <li key={index}>{fix}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* IV. Pipeline Check */}
          {testResults.pipeline_check && (
            <Card>
              <CardHeader>
                <CardTitle>IV. Pipeline Breakpoint Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold">Breakpoint:</h4>
                    <Badge className={getStatusColor('error')}>
                      {testResults.pipeline_check.pipeline_breakpoint}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">Root Cause:</h4>
                    <p className="text-sm">{testResults.pipeline_check.root_cause}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bonus Checks */}
          {testResults.image_payload_check && (
            <Card>
              <CardHeader>
                <CardTitle>🎯 Image Payload Check</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold">Payload Issue:</h4>
                  <p className="text-sm">{testResults.image_payload_check.image_payload_issue}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Payload Example:</h4>
                  <code className="text-xs bg-gray-100 p-2 rounded block">
                    {testResults.image_payload_check.payload_example}
                  </code>
                </div>
                
                <div>
                  <h4 className="font-semibold">How to Fix:</h4>
                  <ul className="list-disc list-inside text-sm">
                    {testResults.image_payload_check.how_to_fix.map((fix: string, index: number) => (
                      <li key={index}>{fix}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {testResults.hardcode_check && (
            <Card>
              <CardHeader>
                <CardTitle>🎯 Hardcoded Accuracy Check</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span>Hardcoded Accuracy:</span>
                    {getStatusIcon(!testResults.hardcode_check.hardcoded_accuracy)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>JSON Received:</span>
                    {getStatusIcon(testResults.hardcode_check.json_received)}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold">Fix Required:</h4>
                  <p className="text-sm">{testResults.hardcode_check.fix}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* V. Final Diagnosis */}
          {testResults.final_diagnosis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bug className="w-5 h-5" />
                  <span>V. Final Diagnosis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">Main Error:</h4>
                  <p className="text-sm font-medium text-red-600">{testResults.final_diagnosis.main_error}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Diagnosis:</h4>
                  <p className="text-sm">{testResults.final_diagnosis.final_diagnosis}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">5-Step Fix Plan:</h4>
                  <ol className="list-decimal list-inside space-y-2">
                    {testResults.final_diagnosis.fix_steps.map((step: string, index: number) => (
                      <li key={index} className="text-sm p-2 bg-blue-50 rounded">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Error Display */}
      {testResults?.error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Test Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{testResults.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KiroTestPage;