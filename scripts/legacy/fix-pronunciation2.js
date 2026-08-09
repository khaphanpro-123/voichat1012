const fs = require('fs')
let f = fs.readFileSync('app/dashboard-new/pronunciation/page.tsx', 'utf8')

// Remove the broken confidence snippet that was left over
f = f.replace(
  `                  \`}>
                      STT confidence: {Math.round(m.confidence * 100)}% — {confidenceLabel(m.confidence)}
                    </div>
                  )}
                </div>`,
  `                </div>`
)

fs.writeFileSync('app/dashboard-new/pronunciation/page.tsx', f, 'utf8')
console.log('Fixed, size:', fs.statSync('app/dashboard-new/pronunciation/page.tsx').size)
