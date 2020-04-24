# resultify

Handle errors with async/await without try/catch.

## Example

```js
const fs = require('fs')
const { resultify } = require('resultify')

const readFile = resultify(fs.readFile)

async function main () {
  const { err, data: file } = await readFile(__filename, 'utf8')
  if (err) {
    console.error('oops', err)
    return
  }

  console.log('echo file')
  console.log(file)
}
```

The `resultify` library is exactly the same as `util.promisify`
except the promise will return `{ err, data }` instead of throwing.

The promise returned from `resultify` will never throw / reject.

This module is great for people that like `async`/`await` and
do not like `try`/`catch`.

## Motivation

There are good and part parts to Promises. `async` & `await` is
definitely one of the good parts.

Unfortunately promises merge [Operational & Programmer errors](https://www.joyent.com/node-js/production/design/errors)
into a single error that you have to `try` / `catch` for.

Go has a really nice pattern for handling errors explicitely

```go
buf, err := ioutil.ReadAll(f)
if err != nil {
  return nil, errors.Wrap(err, "read failed")
}
```

Their approach is to use multiple return values, unfortunately
multiple return values do not exist in javascript but we do
have multiple arguments to functions which is why the
`function done(err, value) {}` callback has always worked nicely.

### Using destructuring

One language feature JavaScript does have is destructuring so
we can do `const { err, data } = await x()`

```js
async function readFile (path) {
  const { err, data: fd } = await open(path, 'r')
  if (err) {
    return { err: new Error('open failed') }
  }

  const buf = Buffer.alloc(64 * 1024)
  const { err: readErr } = await read(fd, buf, 0, buf.length, 0)

  const { err: closeErr } = await close(fd)
  if (closeErr) {
    return { err: new Error('close failed') }
  }

  if (readErr) {
    return { err: new Error('read failed') }
  }

  return { data: buf }
}
```

Using `{ err, data }` as the API for all your async functions
works nicely and makes error handling explicit and removes
`throw`, `try` & `catch`.

This is great for your application code but how do you
interact with the echo system of modules in core & node_modules ?

### Using first & third party modules

The package `resultify` is very similar to `util.promisify` but
instead of returning a promise that rejects on `err` it will
return a `Promise` that always resolves to `{ err, data }`.

Now you can do :

```js
const fs = require('fs')
const { resultify } = require('resultify')

const open = resultify(fs.open)
const read = resultify(fs.read)
const close = resultify(fs.close)
```

If you have a third party library from NPM, like `node-fetch` you
can use the `resultifyP` function to wrap it into returning
a `Promise` that returns `{ err, data }`

```js
const fetchAsPromise = require('node-fetch')
const { resultifyP } = require('resultify')

const fetch = resultifyP(fetchAsPromise)

async function main() {
  const { err, data: res } = await fetch('https://nodejs.org/en/')
  assert.ifError(err)

  assert.ok(res)
  assert.equal(res.status, 200)
}
```

### See also

If you want to read some of my other related projects; check out:

 - [Creating errors](https://github.com/Raynos/error)

## Documentation.

This package implements & exports three functions, `resultify`,
`resultifyP` and `resultifySync`.

The `resultifySync` function exists mostly as a helper to wrap
around `JSON.parse` in case you want to disallow `try` / `catch`
in your codebase.

### `const fn = resultify(original)`

Calling `resultify` on a function returns a promise returning
function similar to how `util.promisify` works.

The `original` function is expected to be a normal nodejs cb last
function, i.e. the last argument is a callback.

The returned function `fn` does not take a callback and instead
returns a promise that resolves to `{ err, data }` which are the
two arguments for the `callback`.

### `const fn = resultifyP(original)`

Calling `resultifyP` on a function returns a promise returning
function similar to how `util.callbackify` works.

The `original` function is expected to be a promise returning
function.

The returned function `fn` has the same arguments and returns
a promise which does not reject and resolves to `{ err, data }`
which are the fulfilled and rejected value of the original promise.

### `const fn = resultifySync(original)`

This function wraps a function that throws and returns `{ err, data }`
synchronously without returning a promise. Useful for `JSON.parse`

```js
const parse = resultifySync(JSON.parse)

const { err, data } = parse('maybe good; maybe bad.')
```

No promises involved.

## Installation

```sh
npm install resultify
```

## Special Thanks

Special thanks goes to [jkroso](https://github.com/jkroso) who
was kind enough to give me the npm name `resultify`.

Check out some of his open source projects in Julia.

## Contributors

 - Raynos

## MIT Licenced.
