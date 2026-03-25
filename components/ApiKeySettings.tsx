'use client';

import React, { useState, useEffect } from 'react';

interface KeyStatus {
  hasOpenaiKey: boolean;
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  hasCohereKey: boolean;
  openaiKeyPreview: string | null;
  geminiKeyPreview: string | null;
  groqKeyPreview: string | null;
  cohereKeyPreview: string | null;
}

interface ModelStatus {
  model: string;
  provider: "gemini" | "openai" | "groq" | "cohere";
  available: boolean;
  error?: string;
  responseTime?: number;
}

interface ProviderStatus {
  keySource: 'USER' | 'SERVER' | 'NONE';
  keyPreview: string | null;
  hasKey: boolean;
  workingModel: string | null;
  allQuotaExceeded: boolean;
  models: ModelStatus[];
}

interface ApiStatus {
  success: boolean;
  userId: string;
  summary: {
    totalModels: number;
    availableModels: number;
    geminiAvailable: number;
    openaiAvailable: number;
    groqAvailable: number;
    cohereAvailable: number;
  };
  gemini: ProviderStatus;
  openai: ProviderStatus;
  groq: ProviderStatus;
  cohere: ProviderStatus;
  recommendation: string;
}

type KeyType = 'openai' | 'gemini' | 'groq' | 'cohere';

export default function ApiKeySettings({ userId = 'anonymous' }: { userId?: string }) {
  const [keys, setKeys] = useState({ openai: '', gemini: '', groq: '', cohere: '' });
  const [showKeys, setShowKeys] = useState({ openai: false, gemini: false, groq: false, cohere: false });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { fetchStatus(); }, [userId]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/user-api-keys?userId=${userId}`);
      const data = await res.json();
      if (data.success) setStatus(data);
    } catch (error) {
      console.error('Fetch status error:', error);
    }
  };

  const checkApiStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/check-api-status?userId=${userId}`);
      const data = await res.json();
      setApiStatus(data);
    } catch (error) {
      console.error('Check API status error:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const saveKey = async (keyType: KeyType) => {
    setLoading(true);
    setMessage(null);
    const body: Record<string, string> = { userId, [`${keyType}Key`]: keys[keyType] };

    try {
      const res = await fetch('/api/user-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        const names: Record<KeyType, string> = { openai: 'OpenAI', gemini: 'Gemini', groq: 'Groq', cohere: 'Cohere' };
        setMessage({ type: 'success', text: `${names[keyType]} API key đã được lưu!` });
        setKeys(prev => ({ ...prev, [keyType]: '' }));
        fetchStatus();
        setTimeout(() => checkApiStatus(), 500);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: 'Lỗi kết nối' });
    } finally {
      setLoading(false);
    }
  };

  const deleteKey = async (keyType: KeyType) => {
    const names: Record<KeyType, string> = { openai: 'OpenAI', gemini: 'Gemini', groq: 'Groq', cohere: 'Cohere' };
    if (!confirm(`Bạn có chắc muốn xóa ${names[keyType]} API key?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user-api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, keyType })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'API key đã được xóa' });
        fetchStatus();
        setApiStatus(null);
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi xóa key' });
    } finally {
      setLoading(false);
    }
  };

  const renderProviderSection = (provider: ProviderStatus | undefined, emoji: string, name: string) => {
    if (!provider) return null;
    return (
      <div className="border border-white/10 rounded-lg p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base sm:text-lg">{emoji}</span>
            <span className="text-white font-medium text-sm sm:text-base">{name}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${
              provider.keySource === 'USER' ? 'bg-green-500/20 text-green-400' :
              provider.keySource === 'SERVER' ? 'bg-blue-500/20 text-blue-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {provider.keySource === 'USER' ? 'Key của bạn' :
               provider.keySource === 'SERVER' ? 'Key server' : 'Chưa có'}
            </span>
          </div>
          {provider.keyPreview && (
            <span className="text-white/40 font-mono text-xs break-all">{provider.keyPreview}</span>
          )}
        </div>
        {provider.models.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {provider.models.map((m) => (
              <div key={m.model} className={`px-2 py-1.5 rounded text-xs ${
                m.available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <div className="font-medium truncate">{m.model}</div>
                <div className="text-white/60 text-xs">{m.available ? `✓ ${m.responseTime}ms` : `✗ ${m.error}`}</div>
              </div>
            ))}
          </div>
        )}
        {!provider.hasKey && <p className="text-white/40 text-xs mt-2">Chưa có API key</p>}
      </div>
    );
  };

  const renderKeyInput = (
    keyType: KeyType, 
    emoji: string, 
    label: string, 
    placeholder: string, 
    link: string, 
    description: string,
    highlight?: boolean
  ) => {
    const hasKey = status?.[`has${keyType.charAt(0).toUpperCase() + keyType.slice(1)}Key` as keyof KeyStatus];
    const preview = status?.[`${keyType}KeyPreview` as keyof KeyStatus];
    
    return (
      <div className={`mb-4 sm:mb-6 ${highlight ? 'p-3 sm:p-4 bg-orange-500/10 rounded-lg sm:rounded-xl border border-orange-500/30' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <label className="text-white font-medium text-sm sm:text-base">{emoji} {label}</label>
            {highlight && <span className="px-2 py-0.5 bg-orange-500/30 text-orange-300 rounded text-xs font-medium">MIỄN PHÍ</span>}
          </div>
          <a href={link} target="_blank" rel="noopener noreferrer"
            className={`${highlight ? 'text-orange-400' : 'text-blue-400'} text-xs sm:text-sm hover:underline`}>
            Lấy key →
          </a>
        </div>
        {hasKey ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="flex-1 bg-white/5 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-green-400 font-mono text-xs sm:text-sm break-all">
              ✓ {preview}
            </div>
            <button onClick={() => deleteKey(keyType)} disabled={loading}
              className="w-full sm:w-auto px-4 py-2 sm:py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm">
              Xóa
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <input type={showKeys[keyType] ? 'text' : 'password'} value={keys[keyType]}
                onChange={(e) => setKeys(prev => ({ ...prev, [keyType]: e.target.value }))} 
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-white/40 pr-10 text-sm sm:text-base" />
              <button onClick={() => setShowKeys(prev => ({ ...prev, [keyType]: !prev[keyType] }))}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1">
                {showKeys[keyType] ? '🙈' : '👁️'}
              </button>
            </div>
            <button onClick={() => saveKey(keyType)} disabled={!keys[keyType] || loading}
              className={`w-full sm:w-auto px-4 py-2 sm:py-3 ${highlight ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition disabled:opacity-50 text-sm sm:text-base font-medium`}>
              Lưu key
            </button>
          </div>
        )}
        <p className={`${highlight ? 'text-orange-300/60' : 'text-white/40'} text-xs mt-2`}>{description}</p>
      </div>
    );
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <span className="text-xl sm:text-2xl">🔑</span>
        <h2 className="text-lg sm:text-xl font-bold text-white">Cấu hình API Keys</h2>
      </div>

      <p className="text-white/60 text-xs sm:text-sm mb-3 sm:mb-4">
        Nhập API key riêng của bạn để sử dụng các tính năng nâng cao. Nếu không có, hệ thống sẽ dùng key mặc định (có giới hạn).
      </p>

      {/* Recommendation Banner */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-lg sm:rounded-xl border border-orange-500/30">
        <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">💡</span>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm sm:text-base mb-1">Khuyên dùng: Groq hoặc Cohere (MIỄN PHÍ!)</h3>
            <p className="text-white/70 text-xs sm:text-sm mb-2 sm:mb-3">
              Để tránh hết quota, hãy đăng ký key miễn phí từ Groq hoặc Cohere. Chỉ mất 1 phút!
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-orange-600 transition">
                🟠 Lấy Groq Key →
              </a>
              <a href="https://dashboard.cohere.com/api-keys" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-purple-500 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-purple-600 transition">
                🟣 Lấy Cohere Key →
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-3 sm:mb-4 p-2 bg-white/5 rounded text-xs text-white/40 break-all">
        User ID: <span className="text-yellow-400 font-mono">{userId}</span>
      </div>

      {message && (
        <div className={`mb-3 sm:mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          <span>{message.type === 'success' ? '✓' : '⚠️'}</span>
          <span className="break-words">{message.text}</span>
        </div>
      )}

      {/* API Status Check */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl">⚡</span>
            <span className="text-white font-medium text-sm sm:text-base">Kiểm tra trạng thái API</span>
          </div>
          <button onClick={checkApiStatus} disabled={checkingStatus}
            className="w-full sm:w-auto px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50">
            <span className={checkingStatus ? 'animate-spin' : ''}>🔄</span>
            {checkingStatus ? 'Đang kiểm tra...' : 'Kiểm tra'}
          </button>
        </div>

        {apiStatus && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-white/60">Tổng model:</span>
              <span className={`px-2 py-1 rounded font-medium text-center ${
                apiStatus.summary.availableModels > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {apiStatus.summary.availableModels}/{apiStatus.summary.totalModels} sẵn sàng
              </span>
            </div>
            {renderProviderSection(apiStatus.gemini, '🔷', 'Google Gemini')}
            {renderProviderSection(apiStatus.openai, '🟢', 'OpenAI')}
            {renderProviderSection(apiStatus.groq, '🟠', 'Groq (FREE)')}
            {renderProviderSection(apiStatus.cohere, '🟣', 'Cohere (FREE)')}
            <div className={`p-3 rounded-lg text-xs sm:text-sm break-words ${
              apiStatus.summary.availableModels === 0 ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
            }`}>
              {apiStatus.recommendation}
            </div>
          </div>
        )}
        {!apiStatus && (
          <p className="text-white/40 text-xs sm:text-sm">Nhấn &quot;Kiểm tra&quot; để xem hệ thống đang dùng API key nào và còn quota không.</p>
        )}
      </div>

      {/* API Key Inputs */}
      {renderKeyInput('groq', '🟠', 'Groq API Key', 'gsk_...', 'https://console.groq.com/keys', 
        '⚡ Khuyên dùng! Miễn phí, nhanh. Dùng Llama 3.3 70B, Mixtral', true)}
      
      {renderKeyInput('cohere', '🟣', 'Cohere API Key', 'your-cohere-key', 'https://dashboard.cohere.com/api-keys', 
        '⚡ Miễn phí! Dùng Command-R, Command-R-Plus', true)}
      
      {renderKeyInput('gemini', '🔷', 'Google Gemini API Key', 'AIza...', 'https://aistudio.google.com/app/apikey', 
        'Dùng cho: Phân tích hình ảnh, Voice Chat')}
      
      {renderKeyInput('openai', '🟢', 'OpenAI API Key', 'sk-proj-...', 'https://platform.openai.com/api-keys', 
        'Dùng cho: Phân tích hình ảnh, Tạo ảnh, Giọng nói')}
    </div>
  );
}
