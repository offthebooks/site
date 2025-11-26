const fs = require('fs')
const { render } = require('./template.js')

const rootUrl = '/blog'
const itemsDir = './blog/items/'
const postDir = './blog/post/'
const unpublished = 'UNPUBLISHED'

const args = new Set(process.argv.slice(2).map((s) => s.toLowerCase()))
const preview = args.has('preview')

function tabs(count) {
  return '  '.repeat(count)
}

function formatDateString(date) {
  if (date === unpublished) return date
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function markupTag(match) {
  const [tag, ...attributes] = match.slice(1, -1).split('|')
  switch (tag) {
    case 'image':
      const [src, alt, cls] = attributes
      const classname = cls ? `class="${cls}" ` : ''
      return `<img ${classname}src="${src}" alt="${alt ?? ''}" />`
    case 'link':
      const [href, text, img] = attributes
      const image = img ? `<img src="${img}" alt="${text}" />` : ''
      const centerClass = img ? ' class="center-text"' : ''
      return `<a href="${href}"${centerClass}>${image}${text}</a>`
    case 'code':
      const [code] = attributes
      return `<span class="code">${code}</span>`
    default:
      throw new Error(`Unrecognized tag type: ${tag}`)
  }
}

// Change straight quotes to curly and double hyphens to em-dashes.
function markupEntities(text) {
  return text
    .replace(/(^|[-\u2014\s(\["])'/g, '$1&lsquo;')
    .replace(/'/g, '&rsquo;')
    .replace(/(^|[-\u2014/\[(\u2018\s])"/g, '$1&ldquo;')
    .replace(/"/g, '&rdquo;')
    .replace(/--/g, '&mdash;')
    .replace(/<(image|link|code)\|([^<>]*)>/g, markupTag)
}

const blocks = {
  '```': 'code',
  '>>>': 'blockquote',
  '###': 'h3'
}

function formatLine({ text, indent = 0, tag = 'p', markup = true, classname = '' }) {
  const cls = classname ? ` class="${classname}"` : ''
  const open = tag ? `<${tag}${cls}>` : ''
  const close = tag ? `</${tag}>` : ''
  const content = markup ? markupEntities(text) : text
  return `${tabs(indent)}${open}${content}${close}`
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
        return formatLine({ text, indent: 4 })
      }
    }

    if (tag) {
      // Opening tag
      block = tag
      return `${tabs(3)}<${tag}>`
    }

    if (!text.length) return []

    return formatLine({ text, indent: 3 })
  })

  return lines.join('\n').trim()
}

function generatePages(posts) {
  console.log(`Generating ${posts.length} pages`)
  posts.forEach((post) => {
    const html = render('../blog/templates/post.html', { image: '/img/logo.jpg', ...post })
    fs.writeFileSync(`${postDir}${post.slug}.html`, html)
  })
}

function generateIndex(sortedPosts) {
  console.log('Generating blog index')
  const posts = sortedPosts.slice(0, 15)
  const html = render('../blog/templates/recent.html', { posts })
  fs.writeFileSync('./blog/index.html', html)
}

function generateRSS(sortedPosts) {
  console.log('Generating rss feed')
  const posts = sortedPosts.slice(0, 15)
  const html = render('../blog/templates/feed.xml', { posts })
  fs.writeFileSync('./blog/feed.rss', html)
}

function build() {
  const posts = fs.readdirSync(itemsDir).flatMap((fname) => {
    if (fname.startsWith('.')) return [] // Skip hidden files like .DS_Store

    const path = `${itemsDir}${fname}`
    const file = fs.readFileSync(path, 'utf8')
    const lines = file.split('\n')

    const post = {}
    while (lines[0].includes(':')) {
      const [key, ...rest] = lines.shift().split(':')
      post[key] = rest.join(':')
    }

    post.date ??= ''
    if (post.date.length) {
      post.date = new Date(post.date)
    } else if (!preview) {
      // Save file with publish date
      const date = new Date()
      post.date = date.toISOString()
      const metaEntries = Object.entries(post).map((e) => e.join(':'))
      const timestampedFile = [...metaEntries, ...lines].join('\n')
      fs.writeFileSync(path, timestampedFile)
      post.date = date
    } else {
      post.date = unpublished
    }

    post.quote = markupEntities(post.quote)
    post.content = markupLines(lines)
    post.url = `${rootUrl}/post/${post.slug}`
    post.dateStr = formatDateString(post.date)

    return post
  })

  if (preview) {
    generatePages(posts.filter(({ date }) => date === unpublished))
  } else {
    posts.sort((a, b) => b.date - a.date)
    generateRSS(posts)
    generateIndex(posts)
    generatePages(posts)
  }
}

build()
