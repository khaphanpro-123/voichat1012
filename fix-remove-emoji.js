const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Find all tsx/ts/jsx/js files in app and components
const files = [
  ...glob.sync('app/**/*.tsx', { ignore: ['node_modules/**'] }),
  ...glob.sync('app/**/*.ts', { ignore: ['node_modules/**'] }),
  ...glob.sync('components/**/*.tsx', { ignore: ['node_modules/**'] }),
  ...glob.sync('components/**/*.ts', { ignore: ['node_modules/**'] }),
]

// Emoji regex - matches most common emoji ranges
const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|✅|❌|⚠️|🔊|🎤|📄|✍️|🌟|🐾|📦|🍎|🏃|🌳|🇬🇧|🇻🇳|🎙|📋|🔴|🟢|🟡|⭐|💡|🔥|🎯|📊|📈|📉|🏆|🎓|📝|🔑|💬|🗣️|👋|🤖|🧠|💪|🎉|🎊|✨|🌈|🚀|💫|⚡|🔔|📌|🔗|🔒|🔓|🔍|🔎|📱|💻|🖥️|⌨️|🖱️|🖨️|📷|📸|🎥|🎬|🎵|🎶|🎸|🎹|🎺|🎻|🥁|🎤|🎧|📻|📺|📡|🔋|🔌|💡|🔦|🕯️|🪔|🧯|🛢️|💰|💵|💴|💶|💷|💸|💳|🪙|💎|⚖️|🔧|🔨|⚒️|🛠️|⛏️|🔩|🪛|🔫|🧲|💣|🪓|🔪|🗡️|⚔️|🛡️|🪚|🔬|🔭|📡|💉|🩸|💊|🩹|🩺|🏥|🚑|🚒|🚓|🚔|🚕|🚖|🚗|🚘|🚙|🛻|🚚|🚛|🚜|🏎️|🏍️|🛵|🛺|🚲|🛴|🛹|🛼|🚏|🛣️|🛤️|⛽|🚧|⚓|🛟|⛵|🚤|🛥️|🛳️|⛴️|🚢|✈️|🛩️|🛫|🛬|🪂|💺|🚁|🚟|🚠|🚡|🛰️|🚀|🛸|🪐|🌍|🌎|🌏|🌐|🗺️|🧭|🏔️|⛰️|🌋|🗻|🏕️|🏖️|🏜️|🏝️|🏞️|🏟️|🏛️|🏗️|🧱|🪨|🪵|🛖|🏘️|🏚️|🏠|🏡|🏢|🏣|🏤|🏥|🏦|🏧|🏨|🏩|🏪|🏫|🏬|🏭|🏯|🏰|💒|🗼|🗽|⛪|🕌|🛕|🕍|⛩️|🕋|⛲|⛺|🌁|🌃|🏙️|🌄|🌅|🌆|🌇|🌉|♨️|🎠|🎡|🎢|💈|🎪|🎭|🖼️|🎨|🎰|🚂|🚃|🚄|🚅|🚆|🚇|🚈|🚉|🚊|🚝|🚞|🚋|🚌|🚍|🚎|🚐|🚑|🚒|🚓|🚔|🚕|🚖|🚗|🚘|🚙|🛻|🚚|🚛|🚜/gu

let totalReplaced = 0

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8')
    const cleaned = content.replace(emojiRegex, '')
    if (cleaned !== content) {
      fs.writeFileSync(file, cleaned, 'utf8')
      const count = (content.match(emojiRegex) || []).length
      totalReplaced += count
      console.log(`Fixed ${file}: removed ${count} emoji(s)`)
    }
  } catch (e) {
    // skip
  }
})

console.log(`\nTotal emoji removed: ${totalReplaced} from ${files.length} files scanned`)
