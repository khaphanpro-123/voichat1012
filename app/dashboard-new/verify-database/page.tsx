"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Database, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function VerifyDatabasePage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runVerification = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/verify-database');
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-50 border-green-200';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200';
      case 'FAIL':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          Database Schema Verification
        </h1>
        <p className="text-gray-600 mt-2">
          Kiểm tra tất cả các bảng và mối quan hệ trong database
        </p>
      </div>

      {/* Run Button */}
      <div className="mb-6">
        <button
          onClick={runVerification}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Đang kiểm tra...
            </>
          ) : (
            <>
              <Database className="w-5 h-5" />
              Chạy kiểm tra
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Summary */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-200">
              <div className="text-3xl font-bold text-gray-900">{results.summary.total}</div>
              <div className="text-sm text-gray-600">Tổng số quan hệ</div>
            </div>
            <div className="bg-green-50 rounded-xl p-6 shadow-md border-2 border-green-200">
              <div className="text-3xl font-bold text-green-600">{results.summary.passed}</div>
              <div className="text-sm text-green-700">✅ Passed</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-6 shadow-md border-2 border-yellow-200">
              <div className="text-3xl font-bold text-yellow-600">{results.summary.warnings}</div>
              <div className="text-sm text-yellow-700">⚠️ Warnings</div>
            </div>
            <div className="bg-red-50 rounded-xl p-6 shadow-md border-2 border-red-200">
              <div className="text-3xl font-bold text-red-600">{results.summary.failed}</div>
              <div className="text-sm text-red-700">❌ Failed</div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Chi tiết kiểm tra</h2>
            
            {results.results.map((result: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-xl p-6 shadow-md border-2 ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(result.status)}
                      <h3 className="text-lg font-bold text-gray-900">{result.relationship}</h3>
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
                        {result.type}
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    result.status === 'PASS' ? 'bg-green-200 text-green-800' :
                    result.status === 'WARNING' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-red-200 text-red-800'
                  }`}>
                    {result.status}
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {Object.entries(result.stats).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-white/50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">{key}</div>
                      <div className="text-lg font-bold text-gray-900">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Issues */}
                {result.issues.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Issues:</div>
                    <ul className="space-y-1">
                      {result.issues.map((issue: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!results && !loading && (
        <div className="text-center py-12 bg-white rounded-2xl shadow-md">
          <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Chưa có kết quả
          </h3>
          <p className="text-gray-500">
            Nhấn "Chạy kiểm tra" để bắt đầu verify database schema
          </p>
        </div>
      )}
    </div>
  );
}
