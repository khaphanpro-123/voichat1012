const fs = require('fs')

let page = fs.readFileSync('app/dashboard-new/ai-chat/page.tsx', 'utf8')

// 1. Add STT state after existing state declarations
page = page.replace(
  "  const endRef = useRef<HTMLDivElement>(null)",
  `  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const endRef = useRef<HTMLDivElement>(null)`
)

// 2. Add STT initialization after the paste useEffect
const sttInit = `
  // Speech-to-text using Web Speech API
  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert("Your browser does not support speech recognition. Please use Chrome."); return }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = "en-US"
    rec.onstart = () => setListening(true)
    rec.onend = () => { setListening(false); recognitionRef.current = null }
    rec.onerror = () => { setListening(false); recognitionRef.current = null }
    rec.onresult = (e: any) => {
      let interim = "", final = ""
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      setInput(prev => {
        // Replace interim with final, or append interim
        const base = prev.replace(/\\s*\\[.*?\\]$/, "").trim()
        if (final) return (base + " " + final).trim()
        return (base + " [" + interim + "]").trim()
      })
    }
    recognitionRef.current = rec
    rec.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
    // Clean up interim brackets
    setInput(prev => prev.replace(/\\s*\\[.*?\\]$/, "").trim())
  }

`

page = page.replace(
  "  const toggleDark = () => {",
  sttInit + "  const toggleDark = () => {"
)

// 3. Add mic button in input bar, between file upload and textarea
page = page.replace(
  `                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />

                <textarea`,
  `                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />

                {/* Mic button */}
                <button
                  onClick={listening ? stopListening : startListening}
                  className={\`flex-shrink-0 p-1.5 rounded-lg transition-colors relative \${listening ? "text-red-500 bg-red-50" : \`\${subCls} hover:text-indigo-500\`}\`}
                  title={listening ? "Stop recording" : "Voice input"}
                >
                  {listening && (
                    <span className="absolute inset-0 rounded-lg bg-red-400/20 animate-ping" />
                  )}
                  <svg className="w-5 h-5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                <textarea`
)

fs.writeFileSync('app/dashboard-new/ai-chat/page.tsx', page, 'utf8')
console.log('Done:', fs.statSync('app/dashboard-new/ai-chat/page.tsx').size, 'bytes')
