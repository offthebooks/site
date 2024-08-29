const fs = require('fs')

const rootUrl = 'https://offthebooks.games/blog'
const itemsDir = './blog/items/'
const postDir = './blog/post/'
const unpublished = 'UNPUBLISHED'

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
    <article>
      ${content}
    </article>
    <footer>${copyright}</footer>
  </body>
</html>
`
}

function tabs(count) {
  return '  '.repeat(count)
}

// Change straight quotes to curly and double hyphens to em-dashes.
function markupEntities(text) {
  return text
    .replace(/(^|[-\u2014\s(\["])'/g, '$1&lsquo;') // opening singles
    .replace(/'/g, '&rsquo;') // closing singles & apostrophes
    .replace(/(^|[-\u2014/\[(\u2018\s])"/g, '$1&ldquo;') // opening doubles
    .replace(/"/g, '&rdquo;') // closing doubles
    .replace(/--/g, '&mdash;') // em-dashes
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
    const tag = text in blocks && blocks[text]

    if (block) {
      // In a code block
      if (tag) {
        // Should be closing block tag
        if (block !== tag) {
          throw new Error('Cannot nest blocks.')
        }
        block = null
        return `${tabs(3)}</${tag}>`
      } else if (block === 'code') {
        return line // Inside a code tag, return unaltered line
      } else {
        return `${tabs(4)}<p>${markupEntities(text)}</p>`
      }
    }

    if (tag) {
      // Opening tag
      block = tag
      return `${tabs(3)}<${tag}>`
    }

    if (!text.length) return []

    return `${tabs(3)}<p>${markupEntities(text)}</p>`
  })

  return lines.join('\n')
}

function generatePages(posts) {
  console.log(`Generating ${posts.length} pages`)
  posts.forEach(({ title, slug, date, quote, image, content }) => {
    content = `<hgroup><h2>${title}</h2><span class="date">${date}</span></hgroup>\n${content}`
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
    while (lines[0].includes(':')) {
      const [key, ...rest] = lines.shift().split(':')
      meta[key] = rest.join(':')
    }

    meta.date ??= ''
    if (meta.date.length) {
      meta.date = new Date(meta.date).toDateString()
    } else if (!preview) {
      // Save file with publish date
      const date = new Date()
      meta.date = date.toISOString()
      const metaEntries = Object.entries(meta).map((e) => e.join(':'))
      const timestampedFile = [...metaEntries, ...lines].join('\n')
      fs.writeFileSync(path, timestampedFile)
      meta.date = date.toDateString()
    } else {
      meta.date = unpublished
    }

    return { ...meta, content: markupLines(lines) }
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
