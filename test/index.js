'use strict'

const fs = require('fs')
const timers = require('timers')
const childProcess = require('child_process')

const fetchAsPromise = require('node-fetch')
const test = require('@pre-bundled/tape')

const {
  resultify, resultifyP, resultifySync, resultifyPromise
} = require('../index.js')

process.on('unhandledRejection', (err) => {
  process.nextTick(() => { throw err })
})

test('resultify() on fs.readFile', async (assert) => {
  const readFile = resultify(fs.readFile)

  const { err, data } = await readFile(__filename, 'utf8')
  assert.ifError(err)
  assert.ok(data)
  assert.equal(typeof data, 'string')

  assert.equal(data.slice(0, 12), "'use strict'")
  assert.end()
})

test('resultify() on fs.stat', async (assert) => {
  const stat = resultify(fs.stat)

  const { err, data } = await stat(__filename)
  assert.ifError(err)
  assert.ok(data)

  await new Promise((resolve) => {
    fs.stat(__filename, (err, stat) => {
      assert.ifError(err)

      assert.ok(stat)
      assert.deepEqual(stat, data)

      resolve()
    })
  })

  const { err: err2, data: data2 } = await stat('notexists')
  assert.ok(err2)
  assert.equal(data2, null)

  assert.equal(err2.code, 'ENOENT')
  assert.equal(err2.syscall, 'stat')

  assert.end()
})

// setTimeout(1); setTimeout(1, 'foobar')
test('resultify() on setTimeout', async (assert) => {
  const setTimeout = resultify(timers.setTimeout)

  const now = Date.now()
  const { err, data } = await setTimeout(10)

  assert.ifError(err)
  assert.equal(data, undefined)

  assert.ok(Date.now() - now >= 10)

  const now2 = Date.now()
  const { err: err2, data: data2 } = await setTimeout(10, 'foobar')

  assert.ifError(err2)
  assert.equal(data2, 'foobar')

  const delta = Date.now() - now2
  // Sometimes setTimeout() is really really fast.
  assert.ok(delta >= 9)

  assert.end()
})

test('resultify() on setImmediate', async (assert) => {
  const setImmediate = resultify(timers.setImmediate)

  const now = process.hrtime.bigint()
  const { err, data } = await setImmediate()
  const delta = process.hrtime.bigint() - now

  assert.ifError(err)
  assert.equal(data, undefined)
  assert.ok(delta >= 1000n * 10n)

  const now2 = process.hrtime.bigint()
  const { err: err2, data: data2 } = await setImmediate('foobar')
  const delta2 = process.hrtime.bigint() - now2

  assert.ifError(err2)
  assert.equal(data2, 'foobar')
  assert.ok(delta2 >= 1000n * 10n)

  assert.end()
})

test('resultify() on fs.read', async (assert) => {
  const open = resultify(fs.open)
  const read = resultify(fs.read)
  const close = resultify(fs.close)

  const { err: openErr, data: fd } = await open(__filename, 'r')

  assert.ifError(openErr)
  assert.ok(fd && typeof fd === 'number')
  assert.ok(fd > 2)

  const buf1 = Buffer.alloc(16 * 1024)
  const { err: readErr, data: bytesRead1 } = await read(
    fd, buf1, 0, 16 * 1024, 0
  )

  assert.ifError(readErr)
  assert.ok(bytesRead1 >= 1024)

  assert.equal(
    buf1.slice(0, 12).toString('utf8'),
    "'use strict'"
  )

  const { err: readErr2, data } = await resultify((cb) => {
    fs.read(fd, buf1, 0, 16 * 1024, 0, (err, bytesRead, buffer) => {
      cb(err, { bytesRead, buffer })
    })
  })()

  assert.ifError(readErr2)
  assert.ok(data)
  assert.ok(data.bytesRead >= 1024)
  assert.equal(data.buffer, buf1)

  const { err: closeErr } = await close(fd)

  assert.ifError(closeErr)

  assert.end()
})

test('resultify() on child_process.exec', async (assert) => {
  const exec = resultify(childProcess.exec)

  const { err, data } = await exec('node -v')
  assert.ifError(err)
  assert.ok(typeof data.stdout === 'string')
  assert.ok(typeof data.stderr === 'string')

  assert.equal(data.stderr, '')
  const version = data.stdout
  assert.equal(version[0], 'v')
  assert.ok(version.length < 20)

  assert.end()
})

test('resultify() on fs.exists', async (assert) => {
  /* eslint-disable-next-line */
  const exists = resultify(fs.exists)

  const { err, data } = await exists(__filename)
  assert.ifError(err)

  assert.equal(data, true)

  assert.end()
})

test('resultifyP() on sleep', async (assert) => {
  const sleep = resultifyP(sleepAsPromise)

  const now = Date.now()
  const { err, data } = await sleep(10)
  assert.ifError(err)
  assert.equal(data, undefined)

  const delta = Date.now() - now
  assert.ok(delta >= 9)

  assert.end()
})

test('resultifyP() on node-fetch', async (assert) => {
  const fetch = resultifyP(fetchAsPromise)

  const { err, data } = await fetch('https://nodejs.org/en/')
  assert.ifError(err)

  assert.ok(data)
  assert.equal(data.status, 200)

  assert.end()
})

test('resultifyPromise is an alias', (assert) => {
  assert.equal(resultifyP, resultifyPromise)
  assert.end()
})

test('resultifySync on JSON.parse', async (assert) => {
  const { err, data } = resultifySync(() => {
    return JSON.parse('"valid"')
  })()

  assert.ifError(err)
  assert.equal(data, 'valid')

  const { err: err2, data: data2 } = resultifySync(() => {
    return JSON.parse('BADDD')
  })()

  assert.ok(err2)
  assert.equal(data2, null)

  assert.equal(err2.name, 'SyntaxError')
  assert.equal(
    err2.message,
    'Unexpected token B in JSON at position 0'
  )

  assert.end()
})

function sleepAsPromise (n) {
  return new Promise((resolve) => {
    timers.setTimeout(resolve, n)
  })
}
