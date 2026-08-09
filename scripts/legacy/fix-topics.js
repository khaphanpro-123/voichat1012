const fs = require('fs')
let f = fs.readFileSync('app/api/writing-practice/route.ts', 'utf8')
// Increase token limits for 15 prompts
f = f.replaceAll('max_tokens: 512', 'max_tokens: 1024')
f = f.replaceAll('maxOutputTokens: 512', 'maxOutputTokens: 1024')
fs.writeFileSync('app/api/writing-practice/route.ts', f, 'utf8')
console.log('Done')
