const fs = require('fs')

let f = fs.readFileSync('app/dashboard-new/ai-chat/page.tsx', 'utf8')

// 1. Add visionSupported computed value after ks state
f = f.replace(
  "  const conn = ks ? [ks.groq && \"Groq\", ks.openai && \"OpenAI\", ks.gemini && \"Gemini\"].filter(Boolean) : []",
  `  const conn = ks ? [ks.groq && "Groq", ks.openai && "OpenAI", ks.gemini && "Gemini"].filter(Boolean) : []
  const visionSupported = ks ? (ks.openai || ks.gemini) : true // true when unknown (not loaded yet)`
)

// 2. Show warning banner when image is selected but no vision API
f = f.replace(
  "            {/* Image preview */}\n            {image && (",
  `            {/* Vision not supported warning */}
            {image && !visionSupported && (
              <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>
                  Image analysis requires <strong>OpenAI</strong> or <strong>Gemini</strong> API key.
                  Groq does not support vision. <a href="/settings" className="underline hover:text-amber-300">Add a key in Settings</a>.
                </span>
              </div>
            )}

            {/* Image preview */}
            {image && (`
)

// 3. Disable send button when image + no vision support
f = f.replace(
  ": <button onClick={send} disabled={!input.trim() && !image}",
  `: <button onClick={send} disabled={(!input.trim() && !image) || (!!image && !visionSupported)}`
)

fs.writeFileSync('app/dashboard-new/ai-chat/page.tsx', f, 'utf8')
console.log('Fixed, size:', fs.statSync('app/dashboard-new/ai-chat/page.tsx').size)
