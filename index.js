'use strict'

const promisifyCustom = require('util').promisify.custom

class Result {
  constructor (err, data) {
    this.err = err
    this.data = data
  }
}

exports.resultifyP = resultifyPromise
exports.resultifyPromise = resultifyPromise
exports.resultify = resultify
exports.resultifySync = resultifySync

/**
 * const { resultify } = require('resultify')
 * const fs = require('fs')
 *
 * const readFile = resultify(fs.readFile)
 *
 * async function main () {
 *   const { err, data } = await readFile('my-file')
 *
 *   const { err, data } = await resultify((cb) => {
 *     fs.readFile('my-file', cb)
 *   })()
 * }
 */
function resultify (original) {
  if (typeof original !== 'function') {
    throw new Error('original must be a function.')
  }

  if (original[promisifyCustom]) {
    const fn = original[promisifyCustom]
    if (typeof fn !== 'function') {
      throw new Error('util.promisify.custom must be a function.')
    }

    return resultifyPromise(fn)
  }

  function fn (...args) {
    return new Promise((resolve) => {
      original.call(this, ...args, (err, value) => {
        if (err) {
          return resolve(new Result(err, null))
        }

        resolve(new Result(null, value))
      })
    })
  }

  return fn
}

/**
 * const { resultifyP } = require('resultify')
 *
 * const { err, data } = await resultifyP(() => {
 *  return s3.listBuckets().promise()
 * })()
 */
function resultifyPromise (original) {
  if (typeof original !== 'function') {
    throw new Error('original must be a function.')
  }

  function fn () {
    const p = original.apply(this, arguments)
    return p.then(createResolveResult, createRejectResult)
  }

  return fn
}

/**
 * const { resultifySync } = require('resultify')
 *
 * const { err, data } = await resultifySync(() => {
 *   return JSON.parse(str)
 * })()
 */
function resultifySync (original) {
  if (typeof original !== 'function') {
    throw new Error('original must be a function.')
  }

  function fn () {
    try {
      const ret = original.apply(this, arguments)
      return new Result(null, ret)
    } catch (err) {
      return new Result(err, null)
    }
  }

  return fn
}

function createResolveResult (data) {
  return new Result(null, data)
}

function createRejectResult (err) {
  return new Result(err, null)
}
