const fs = require('fs')

// Fix API system prompt
let api = fs.readFileSync('app/api/pronunciation/route.ts', 'utf8')
api = api.replace(
  /const SYS = `[\s\S]*?`/,
  `const SYS = \`You are an English pronunciation coach and friendly conversation partner for Vietnamese learners.

The user speaks English and you receive the transcribed text. Analyze it for common Vietnamese pronunciation mistakes.

RULES:
- If pronunciation seems correct (no obvious issues): just reply naturally to what they said, no feedback needed
- If there are pronunciation issues: briefly mention them INLINE in your reply, naturally woven in
  Example: "Good question! By the way, 'are' is pronounced /ɑːr/ not /a/ — Vietnamese speakers often miss the 'r' sound. Anyway, I'm doing great, how about you?"
- Keep feedback SHORT (1 sentence max), then continue the conversation
- Never use headers like "PRONUNCIATION FEEDBACK:" or "RESPONSE:" — just write naturally
- Be warm, encouraging, conversational
- Reply in English for the conversation part, Vietnamese only for pronunciation tips if needed
- Focus on: final consonants (t/d/s/n), vowel sounds (/æ/ /ɪ/ /ʊ/), th sounds, r/l distinction\``
)
fs.writeFileSync('app/api/pronunciation/route.ts', api, 'utf8')
console.log('API fixed')

// Fix frontend - remove confidence display, simplify message rendering
let page = fs.readFileSync('app/dashboard-new/pronunciation/page.tsx', 'utf8')

// Remove confidence display from user message
page = page.replace(
  /\{m\.confidence !== undefined && \([\s\S]*?\)\}/,
  ''
)

// Simplify AI message rendering - remove the complex section parsing
page = page.replace(
  /\{m\.content \? \(\s*<div className="space-y-3">[\s\S]*?<\/div>\s*\) :/,
  `{m.content ? (
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">{m.content}</p>
                  ) :`
)

// Remove confidence from Msg interface
page = page.replace('interface Msg { role: "user" | "assistant"; content: string; confidence?: number }',
  'interface Msg { role: "user" | "assistant"; content: string }')

// Remove confidence state and related code
page = page.replace(/const \[confidence, setConfidence\] = useState<number \| null>\(null\)\n/, '')
page = page.replace(/let finalConf: number \| null = null\n/, '')
page = page.replace(/finalConf = e\.results\[i\]\[0\]\.confidence\n/, '')
page = page.replace(/if \(finalConf !== null\) setConfidence\(finalConf\)\n/, '')
page = page.replace(/setConfidence\(null\)\n/, '')
page = page.replace(/confidence: finalConf \?\? undefined/, '')
page = page.replace(/sendToAI\(finalText\.trim\(\), finalConf\)/, 'sendToAI(finalText.trim())')
page = page.replace(/const sendToAI = useCallback\(async \(userText: string, conf: number \| null\)/, 
  'const sendToAI = useCallback(async (userText: string)')

fs.writeFileSync('app/dashboard-new/pronunciation/page.tsx', page, 'utf8')
console.log('Page fixed:', fs.statSync('app/dashboard-new/pronunciation/page.tsx').size)
