import ApiKeySettings from "@/components/ApiKeySettings";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white text-center mb-2">⚙️ Cài đặt</h1>
        <p className="text-white/60 text-center mb-8">Cấu hình API keys để sử dụng các tính năng nâng cao</p>
        
        <ApiKeySettings userId="anonymous" />

        <div className="mt-6 bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-2">💡 Tại sao cần API key riêng?</h3>
          <ul className="text-white/60 text-sm space-y-1">
            <li>• Không bị giới hạn số lượt sử dụng</li>
            <li>• Tốc độ phản hồi nhanh hơn</li>
            <li>• Bảo mật - key chỉ lưu trong tài khoản của bạn</li>
            <li>• Tự kiểm soát chi phí API</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
