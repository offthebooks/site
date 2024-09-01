const _int_invalid_tokens = [
    '_int_invalid_tokens',
    '_int_invalid_token_set',
    '_int_globally_scoped_variables',
    '_int_get_template_string',
    '_int_template_name',
    '_int_data',
    '_int_destructured_keys',
    '_int_destructure_data',
    '_int_template_string'
  ],
  _int_invalid_token_set = new Set(_int_invalid_tokens),
  // remove these from local scope of eval for rendering the template
  _int_globally_scoped_variables = [
    'global',
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname'
  ],
  // Get/validate/cache the template from the filesystem
  _int_get_template_string = (() => {
    const fs = require('fs'),
      cachedTemplates = [],
      templateFn = (template) => {
        if (cachedTemplates[template] === undefined) {
          var templateHtml = fs.readFileSync(`${__dirname}/${template}`, 'utf8')
          _int_invalid_tokens.forEach((i) => {
            if (templateHtml.includes(i)) {
              throw Error(`Template ${template} includes invalid token: ${i}`)
            }
          })
          cachedTemplates[template] = '(()=>`' + templateHtml + '`)();'
        }

        return cachedTemplates[template]
      }

    return templateFn
  })(),
  // Destructure object keys to local vars, and render template string using eval
  _int_render = (_int_template_name, _int_data) => {
    let _int_destructured_keys = new Set([
        ..._int_globally_scoped_variables,
        ...Object.keys(_int_data).filter((i) => !_int_invalid_token_set.has(i))
      ]),
      _int_destructure_data = `var {${[..._int_destructured_keys].join(',')}}=_int_data;`,
      _int_template_string = _int_get_template_string(_int_template_name)

    try {
      eval(_int_destructure_data)
      return eval(_int_template_string)
    } catch (e) {
      throw Error(`Problem rendering template ${_int_template_name}: ${e}`)
    }
  }

// Helpers, they ARE referenced by templates through eval()
function each(item, fn) {
  if (!Array.isArray(item)) {
    throw 'Used each on non-array type'
  }

  return item.map(fn).join('')
}

function check(condition, positive, negative = '') {
  if (condition) {
    return positive
  } else {
    return negative
  }
}

const cache_buster = `?${new Date().getTime().toString(36)}`

exports = module.exports = {
  render: _int_render
}
