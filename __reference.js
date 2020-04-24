const kCustomPromisifiedSymbol = Symbol('nodejs.util.promisify.custom')
const kCustomPromisifyArgsSymbol = Symbol('customPromisifyArgs')

function promisify (original) {
  if (typeof original !== 'function') { throw new Error('original', 'Function', original) }

  if (original[kCustomPromisifiedSymbol]) {
    const fn = original[kCustomPromisifiedSymbol]
    if (typeof fn !== 'function') {
      throw new Error('util.promisify.custom', 'Function', fn)
    }
    return Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    })
  }

  // Names to create an object from in case the callback receives multiple
  // arguments, e.g. ['bytesRead', 'buffer'] for fs.read.
  const argumentNames = original[kCustomPromisifyArgsSymbol]

  function fn (...args) {
    return new Promise((resolve, reject) => {
      original.call(this, ...args, (err, ...values) => {
        if (err) {
          return reject(err)
        }
        if (argumentNames !== undefined && values.length > 1) {
          const obj = {}
          for (let i = 0; i < argumentNames.length; i++) { obj[argumentNames[i]] = values[i] }
          resolve(obj)
        } else {
          resolve(values[0])
        }
      })
    })
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(original))

  Object.defineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn, enumerable: false, writable: false, configurable: true
  })
  return Object.defineProperties(
    fn,
    Object.getOwnPropertyDescriptors(original)
  )
}

promisify.custom = kCustomPromisifiedSymbol
