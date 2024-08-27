const fs = require('fs')

const itemsDir = './blog/items/'
const unpublished = 'UNPUBLISHED'

const args = new Set(process.argv.slice(2).map((s) => s.toLowerCase()))
const preview = args.has('preview')

function markupLines(lines) {
  lines = lines.flatMap((line) => {
    const text = line.trim()
    if (!text.length) return []

    return `<p>${line}</p>`
  })

  return lines.join('\n')
}

function generatePages(posts) {
  console.log(`Generating ${posts.length} pages`)
}

function generateIndex(posts) {
  console.log('Generating blog index')
}

function generateRSS(posts) {
  console.log('Generating rss feed')
}

function build() {
  const posts = fs.readdirSync(itemsDir).map((fname) => {
    const path = `${itemsDir}${fname}`
    const file = fs.readFileSync(path, 'utf8')
    const [title, slug, publishDate, ...lines] = file.split('\n')

    const date = unpublished

    if (publishDate.length) {
      date = new Date(publishDate)
    } else if (!preview) {
      date = new Date()
      const timestampedFile = [title, slug, date.toISOString(), publishDate, ...lines].join('\n')
      fs.writeFileSync(path, timestampedFile)
    }

    return { title, slug, date, html: markupLines(lines) }
  })

  if (preview) {
    generatePages(posts.filter(({ date }) => date === unpublished))
  } else {
    generateRSS(posts)
    generateIndex(posts)
    generatePages(posts)
  }

  console.log(posts)
}

build()
