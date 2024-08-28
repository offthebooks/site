const fs = require('fs')

const rootUrl = 'https://offthebooks.games/blog'
const itemsDir = './blog/items/'
const postDir = './blog/post/'
const unpublished = 'UNPUBLISHED'
const tabCharacter = '  '

const args = new Set(process.argv.slice(2).map((s) => s.toLowerCase()))
const preview = args.has('preview')

const temp = `<a href="/"><h1>Off The Books</h1></a>

<h2>Blog</h2>

<a href="./feed.rss">RSS Feed</a>

<p>
  Welcome to the Off The Books Blog. Here you'll find posts on the video game industry,
  development, and related anecdotes.
</p>

<article>
  <a href=""
    ><span class="title">Post Title &rarr;</span>
    <span class="date"
      ><script>
        document.write(new Date().toDateString())
      </script></span
    ></a
  >
  <blockquote>This is the pull quote from the post.</blockquote>
</article>`

function template({ title, description, image, url, content }) {
  const joinStr = `\n${tabCharacter}${tabCharacter}`
  const indentedContent = `${content.split('\n').join(joinStr)}`
  const copyright = `copyright ${new Date().getFullYear()}`

  return `<html>
  <head>
    <title>${title}</title>
    <meta
      name="description"
      content="${description}" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta property="og:title" content="${title}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image ?? '/img/logo.jpg'}" />
    <link rel="icon" href="/favicon.ico" type="image/x-icon" />
    <link rel="apple-touch-icon" href="/img/logo.jpg" />
    <link href="/css/blog.css" rel="stylesheet" />
  </head>
  <body>
    <a href="/"><h1>Off The Books</h1></a>
    ${indentedContent}
    <footer>${copyright}</footer>
  </body>
</html>
`
}

// Automatically wraps any lines in p tags,
// unless we are inside a formatted block:
const blocks = {
  '```': 'code',
  '>>>': 'blockquote'
}

function markupLines(lines) {
  let block = null
  lines = lines.flatMap((line) => {
    const text = line.trim()
    if (!text.length) return []

    if (line in blocks) {
      const tag = blocks[line]

      if (block && block !== tag) {
        throw new Error('Cannot nest blocks.')
      }

      // Close or open a block
      if (block) {
        block = null
        return `</${tag}>`
      } else {
        block = tag
        return `<${tag}>`
      }
    } else {
      return block ? line : `<p>${line}</p>`
    }
  })

  return lines.join('\n')
}

function generatePages(posts) {
  console.log(`Generating ${posts.length} pages`)
  posts.forEach(({ title, slug, date, quote, image, content }) => {
    content = `<div><h2>${title}</h2><span class="date">${date}</span></div>\n${content}`
    const url = `${rootUrl}/post/${slug}`
    title = `${title} - Off The Books`
    description = quote ?? `${title} Blog Post`
    const html = template({ title, description, image, url, content })
    fs.writeFileSync(`${postDir}${slug}.html`, html)
  })
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
    const lines = file.split('\n')

    const meta = {}
    console.log(typeof lines, typeof lines[0])
    while (lines[0].includes(':')) {
      const [key, ...rest] = lines.shift().split(':')
      meta[key] = rest.join(':')
    }

    const date = unpublished

    if (meta.date.length) {
      date = new Date(meta.date)
    } else if (!preview) {
      date = new Date()
      const metaEntries = meta.entries.map((e) => e.join(':'))
      const timestampedFile = [...metaEntries, ...lines].join('\n')
      fs.writeFileSync(path, timestampedFile)
    }

    return { ...meta, date, content: markupLines(lines) }
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
