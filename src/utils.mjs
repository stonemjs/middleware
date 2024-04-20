import send from 'send'
import bytes from 'bytes'
import Busboy from 'busboy'
import typeIs from 'type-is'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import onFinished from 'on-finished'
import contentType from 'content-type'
import { randomUUID } from 'node:crypto'
import ipRangeCheck from 'ip-range-check'
import { createWriteStream } from 'node:fs'
import { HttpError } from '@stone-js/common'
import { UploadedFile } from '@stone-js/http'

/**
 * Check if multipart message.
 *
 * @param   {(http.IncomingMessage|string)} value
 * @returns {boolean}
 */
export function isMultipart (value) {
  return typeof value === 'string'
    ? typeIs.is(value, ['multipart']) === 'multipart'
    : typeIs(value, ['multipart']) === 'multipart'
}

/**
 * Message content type.
 *
 * @param   {(http.IncomingMessage|string)} value
 * @param   {string} [fallback='text/plain']
 * @returns {string}
 */
export function getType (value, fallback = 'text/plain') {
  try {
    return contentType.parse(value).type
  } catch (_) {
    return fallback
  }
}

/**
 * Message content charset.
 *
 * @param   {(http.IncomingMessage|string)} value
 * @param   {string} [fallback='utf-8']
 * @returns {string}
 */
export function getCharset (value, fallback = 'utf-8') {
  try {
    return contentType.parse(value).parameters.charset
  } catch (_) {
    return fallback
  }
}

/**
 * Check if ip is trusted or not.
 *
 * @param   {(string|string[])} trusted
 * @param   {(string|string[])} [untrusted=[]]
 * @returns {Function}
 */
export function isIpTrusted (trusted, untrusted = []) {
  return (ip) => {
    if (untrusted.includes('*') || ipRangeCheck(ip, untrusted)) {
      return false
    }

    return trusted.includes('*') || ipRangeCheck(ip, trusted)
  }
}

/**
 * Get protocol.
 *
 * @param   {string}  ip
 * @param   {Headers} headers
 * @param   {boolean} encrypted
 * @param   {Object}  options
 * @param   {Array}   options.trustedIp
 * @param   {Array}   options.untrustedIp
 * @returns {string}
 */
export function getProtocol (ip, headers, encrypted, { trustedIp, untrustedIp }) {
  let protocol = encrypted ? 'https' : 'http'

  if (isIpTrusted(trustedIp, untrustedIp)(ip)) {
    protocol = (headers['X-Forwarded-Proto'] ?? headers['x-forwarded-proto'] ?? '').split(',').shift().trim()
  }

  return protocol || 'http'
}

/**
 * Get hostname.
 *
 * @param   {string}  ip
 * @param   {Headers} headers
 * @param   {Object}  options
 * @param   {string}  options.fallback
 * @param   {Array}   options.trusted
 * @param   {Array}   options.trustedIp
 * @param   {Array}   options.untrustedIp
 * @returns {string}
 */
export function getHostname (ip, headers, { trusted, trustedIp, untrustedIp }) {
  let hostname = headers.host ?? headers.Host

  if (isIpTrusted(trustedIp, untrustedIp)(ip)) {
    hostname = (headers['X-Forwarded-Host'] ?? headers['x-forwarded-host'] ?? '').split(',').shift()
  }

  if (!hostname) return hostname

  // IPv6 literal support
  const match = hostname.match(/\[([0-9a-fA-F:]+)\]/)

  if (match) {
    hostname = `[${match[1]}]`
  } else {
    // Validate hostname according to RFC 952 and RFC 2181
    hostname = hostname.trim().replace(/:\d+$/, '').toLowerCase()
  }

  // Validate hostname according to RFC 952 and RFC 2181
  if (!/^[[]?(?![0-9]+$)(?!-)(?:[a-zA-Z0-9-:\]]{1,63}\.?)+$/.test(hostname)) {
    throwSuspiciousOperationError('Invalid Host', ip, hostname)
  }

  if (trusted?.length) {
    let isValid = false
    for (const pattern of trusted) {
      if (pattern instanceof RegExp && pattern.test(hostname)) {
        isValid = true
      } else if (pattern === hostname) {
        isValid = true
      }
    }

    if (!isValid) {
      throwSuspiciousOperationError('Untrusted Host', ip, hostname)
    }
  }

  return hostname
}

/**
 * Get file from message.
 *
 * @param   {Object} message
 * @param   {Object} options
 * @returns {string}
 */
export function getFilesFromMessage (message, options) {
  return new Promise((resolve, reject) => {
    options.limits ??= {}
    options.limits.fileSize = bytes.parse(options.limits.fileSize) ?? Infinity
    options.limits.fieldSize = bytes.parse(options.limits.fieldSize) ?? Infinity
    options.limits.fieldNameSize = bytes.parse(options.limits.fieldNameSize) ?? Infinity

    const headers = message.headers
    const result = { files: {}, fields: {} }
    const busboy = Busboy({ headers, ...options })

    busboy
      .on('close', () => resolve(result))
      .on('error', (error) => reject(getHttpError(500, 'Cannot upload files.', error.message, `HTTP_FILE-${error.code}`, error)))
      .on('field', (fieldname, value) => {
        result.fields[fieldname] = value
      })
      .on('file', (fieldname, file, info) => {
        result.files[fieldname] ??= []
        const { filename, mimeType } = info
        const filepath = join(tmpdir(), `${options.prefix ?? 'file'}-${randomUUID()}`)

        file.on('close', () => {
          result.files[fieldname].push(new UploadedFile(filepath, filename, mimeType))
        })

        file.pipe(createWriteStream(filepath))
      })

    if (message.pipe) {
      message.pipe(busboy)
    } else {
      busboy.write(message.body, message.encoding)
      busboy.end()
    }
  })
}

/**
 * Stream files from the file system as an http response.
 *
 * @param   {http.IncomingMessage} message
 * @param   {http.OutgoingMessage} response
 * @param   {BinaryFileResponse}   fileResponse
 * @param   {Object} options
 * @returns {Promise}
 */
export function streamFile (message, response, fileResponse, options) {
  return new Promise((resolve, reject) => {
    let streaming
    const file = send(message, fileResponse.getEncodedFilePath(), options)
    const onaborted = () => reject(getHttpError(400, 'Request aborted.', 'Request aborted.', 'HTTP_FILE-ECONNABORTED'))

    onFinished(response, (error) => {
      if (error && error.code === 'ECONNRESET') return onaborted()
      if (error) return reject(getHttpError(500, 'An unexpected error has occurred.', error.message, `HTTP_FILE-${error.code}`, error))

      setImmediate(() => streaming !== false ? onaborted() : resolve())
    })

    file
      .on('error', (error) => reject(getHttpError(500, 'An unexpected error has occurred.', error.message, `HTTP_FILE-${error.code}`, error)))
      .on('directory', () => reject(getHttpError(404, 'This file cannot be found.', 'EISDIR, read', 'HTTP_FILE-EISDIR')))
      .on('headers', (resp) => Object.entries(options.headers).forEach(([key, value]) => resp.setHeader(key, value)))
      .on('stream', () => { streaming = true })
      .on('file', () => { streaming = false })
      .on('end', () => resolve())
      .pipe(response)
  })
}

/**
 * Throw Suspicious Operation Error.
 *
 * @param  {string} message
 * @param  {string} ip
 * @param  {string} host
 * @throws {HttpError}
 */
export function throwSuspiciousOperationError (message, ip, host) {
  throw getHttpError(
    400,
    `${message} ${host}`,
    `SuspiciousOperation: ${message} ${host} with ip(${ip})`
  )
}

/**
 * Return HttpError instance.
 *
 * @param   {number} statusCode
 * @param   {string} body
 * @param   {string} message
 * @param   {string} code
 * @param   {*} cause
 * @returns {HttpError}
 */
export function getHttpError (statusCode, body, message, code, cause = null) {
  return new HttpError(statusCode, body, message, { code, cause })
}
