import * as Utils from '../src/utils.mjs'

jest.mock('node:fs', () => ({
  createWriteStream: jest.fn()
}))

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 12345)
}))

jest.mock('@stone-js/http', () => ({
  UploadedFile: jest.fn((filepath, filename, mimeType) => ({ filepath, filename, mimeType }))
}))

jest.mock('node:os', () => ({
  tmpdir: jest.fn(() => '/path')
}))

jest.mock('busboy', () => () => {
  const file = { on: jest.fn((_, v) => v()), pipe: jest.fn() }
  return {
    events: {},
    on (event, listener) {
      this.events[event] = listener
      return this
    },
    end () {
      this.events.field('username', 'stone')
      this.events.file('picture', file, { filename: 'photo.png', mimeType: 'image/png' })
      this.events.close()
    },
    write () {
      this.events.error({ message: 'error' })
    }
  }
})

let onFinishedCallback = jest.fn()

jest.mock('on-finished', () => (_, cb) => {
  onFinishedCallback = cb
})

const send = {
  events: {},
  on (event, listener) {
    this.events[event] = listener
    return this
  },
  dispatchEvent (event, data) {
    this.events[event](data)
  },
  pipe (response) {
    this.events.error({ message: 'error', code: 'error' })
    response.end()
  }
}

jest.mock('send', () => () => send)

describe('Utils', () => {
  /**
   * The presence of a message body in a request is signaled by
   * a Content-Length or Transfer-Encoding header field.
   * https://www.rfc-editor.org/rfc/rfc9112#name-message-body
  */
  describe('#isMultipart', () => {
    it('Must return `true` for a multipart message', () => {
      // Arrange
      const message = {
        headers: {
          'content-length': 0,
          'content-type': 'multipart/form-data; boundary=---------------------------123456789012345678901234567890'
        }
      }
      const message2 = {
        headers: {
          'transfer-encoding': 'chunked',
          'content-type': 'multipart/form-data; boundary=---------------------------123456789012345678901234567890'
        }
      }

      // Assert
      expect(Utils.isMultipart(message)).toBe(true)
      expect(Utils.isMultipart(message2)).toBe(true)
      expect(Utils.isMultipart(message2.headers['content-type'])).toBe(true)
    })

    it('Must return `false` for a non multipart message', () => {
      // Arrange
      const message = {
        headers: {
          'content-type': 'multipart/form-data; boundary=---------------------------123456789012345678901234567890'
        }
      }
      const message2 = { headers: {} }

      // Assert
      expect(Utils.isMultipart(message)).toBe(false)
      expect(Utils.isMultipart(message2)).toBe(false)
    })
  })

  describe('#getType', () => {
    it('Must return message content-type type', () => {
      expect(Utils.getType({ headers: { 'content-type': 'json; charset=utf-8' } })).toBe('text/plain')
      expect(Utils.getType({ headers: { 'content-type': 'application/json; charset=utf-8' } })).toBe('application/json')
    })
  })

  describe('#getCharset', () => {
    it('Must return message content-type charset', () => {
      expect(Utils.getCharset({ headers: { 'content-type': 'json; charset=iso-8859-15' } })).toBe('utf-8')
      expect(Utils.getCharset({ headers: { 'content-type': 'application/json; charset=iso-8859-15' } })).toBe('iso-8859-15')
    })
  })

  describe('#isIpTrusted', () => {
    it('Must return `false` when `untrusted` contains `*`', () => {
      expect(Utils.isIpTrusted([], '*')('127.0.0.1')).toBe(false)
      expect(Utils.isIpTrusted([], ['*'])('127.0.0.1')).toBe(false)
    })

    it('Must return `false` when ip is in the `untrusted` ip range', () => {
      expect(Utils.isIpTrusted([], '102.1.5.2/24')('102.1.5.253')).toBe(false)
      expect(Utils.isIpTrusted([], ['192.168.1.1', '192.168.1.3'])('192.168.1.3')).toBe(false)
    })

    it('Must return `true` when `trusted` contains `*`', () => {
      expect(Utils.isIpTrusted('*')('127.0.0.1')).toBe(true)
      expect(Utils.isIpTrusted(['*'])('127.0.0.1')).toBe(true)
    })

    it('Must return `true` when ip is in the `trusted` ip range', () => {
      expect(Utils.isIpTrusted('102.1.5.2/24')('102.1.5.253')).toBe(true)
      expect(Utils.isIpTrusted(['192.168.1.1', '192.168.1.3'])('192.168.1.3')).toBe(true)
    })

    it('Must return `false` when ip is not in the `trusted` ip range', () => {
      expect(Utils.isIpTrusted('102.1.5.2/24')('102.1.6.253')).toBe(false)
      expect(Utils.isIpTrusted(['192.168.1.1', '192.168.1.3'])('192.168.1.2')).toBe(false)
    })
  })

  describe('#getProtocol', () => {
    it('Must return protocol from proxy when trusted', () => {
      // Arrange
      const options = {
        trustedIp: '102.1.5.2/24',
        untrustedIp: []
      }
      const headers = { 'X-Forwarded-Proto': 'http' }
      const headers2 = { 'x-forwarded-proto': 'https' }

      // Act
      const proto = Utils.getProtocol('102.1.5.253', headers, true, options)
      const proto2 = Utils.getProtocol('102.1.5.253', headers2, false, options)
      const proto3 = Utils.getProtocol('102.1.5.253', {}, true, options)

      // Assert
      expect(proto).toBe('http')
      expect(proto2).toBe('https')
      expect(proto3).toBe('http')
    })

    it('Must return protocol from headers when proxy not trusted', () => {
      // Arrange
      const options = {
        trustedIp: [],
        untrustedIp: []
      }
      const headers = { 'X-Forwarded-Proto': 'http' }
      const headers2 = { 'x-forwarded-proto': 'https' }

      // Act
      const proto = Utils.getProtocol('102.1.5.253', headers, true, options)
      const proto2 = Utils.getProtocol('102.1.5.253', headers2, false, options)

      // Assert
      expect(proto).toBe('https')
      expect(proto2).toBe('http')
    })
  })

  describe('#getHostname', () => {
    it('Must return hostname from proxy when trusted', () => {
      // Arrange
      const options = {
        trusted: [],
        trustedIp: '102.1.5.2/24',
        untrustedIp: []
      }
      const headers = { 'X-Forwarded-Host': 'www.example.com' }
      const headers2 = { 'x-forwarded-host': 'www.example.com' }

      // Act
      const hostname = Utils.getHostname('102.1.5.253', headers, options)
      const hostname2 = Utils.getHostname('102.1.5.253', headers2, options)
      const hostname3 = Utils.getHostname('102.1.5.253', {}, options)

      // Assert
      expect(hostname).toBe('www.example.com')
      expect(hostname2).toBe('www.example.com')
      expect(hostname3).toBe('')
    })

    it('Must return hostname from headers when proxy not trusted', () => {
      // Arrange
      const options = {
        trusted: ['www.example.com', /\[([0-9a-fA-F:]+)\]/],
        trustedIp: [],
        untrustedIp: []
      }
      const headers = { host: 'www.example.com:8080' }
      const headers2 = { Host: '[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:[2001:0db8:85a3:2222:0000:8a2e:0370:7334]' }

      // Act
      const hostname = Utils.getHostname('102.1.5.253', headers, options)
      const hostname2 = Utils.getHostname('102.1.5.253', headers2, options)

      // Assert
      expect(hostname).toBe('www.example.com')
      expect(hostname2).toBe('[2001:0db8:85a3:0000:0000:8a2e:0370:7334]')
    })

    it('Must return hostname only for trusted subdomain', () => {
      // Arrange
      const options = {
        trusted: [/^(.+\.)+example.com$/],
        trustedIp: [],
        untrustedIp: []
      }
      const headers = { host: 'www.example.com:8080' }
      const headers2 = { Host: 'admin.dev.example.com:8080' }

      // Act
      const hostname = Utils.getHostname('102.1.5.253', headers, options)
      const hostname2 = Utils.getHostname('102.1.5.253', headers2, options)

      // Assert
      expect(hostname).toBe('www.example.com')
      expect(hostname2).toBe('admin.dev.example.com')
    })

    it('Must throw an error for invalid hostname', () => {
      // Arrange
      const options = {
        trusted: [/^(.+\.)+example.com$/],
        trustedIp: [],
        untrustedIp: []
      }

      try {
        // Act
        const hostname = Utils.getHostname('102.1.5.253', { host: 'www.domain.com' }, options)
        expect(hostname).toBe(false)
      } catch (error) {
        // Assert
        expect(error.message).toBe('SuspiciousOperation: Untrusted Host www.domain.com with ip(102.1.5.253)')
      }

      try {
        // Act
        const hostname = Utils.getHostname('102.1.5.253', { host: '-example_.com?lorem' }, options)
        expect(hostname).toBe(false)
      } catch (error) {
        // Assert
        expect(error.message).toBe('SuspiciousOperation: Invalid Host -example_.com?lorem with ip(102.1.5.253)')
      }
    })
  })

  describe('#getFilesFromMessage', () => {
    it('Must return files with fields values', async () => {
      // Act
      const response = await Utils.getFilesFromMessage({ headers: {}, pipe: v => v.end() }, {})

      // Assert
      expect(response.fields.username).toBe('stone')
      expect(response.files.picture.length).toBe(1)
      expect(response.files.picture[0].mimeType).toBe('image/png')
      expect(response.files.picture[0].filename).toBe('photo.png')
      expect(response.files.picture[0].filepath).toBe('/path/file-12345')
    })

    it('Must throw an error when not valid', async () => {
      // Act
      try {
        const response = await Utils.getFilesFromMessage({ headers: {}, body: {}, encoding: '' }, {})
        expect(response).toBe(true) // Failed check test
      } catch (error) {
        expect(error.body).toBe('Cannot upload files.')
        expect(error.message).toBe('error')
      }
    })
  })

  describe('#streamFile', () => {
    const response = { end: jest.fn(), setHeader: jest.fn() }

    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    it('Must call end callback', async () => {
      // Arrange
      send.pipe = function (response) {
        this.events.end()
        response.end()
      }

      // Act
      const result = await Utils.streamFile({}, response, { getEncodedFilePath: () => '' }, { headers: { host: 'host' } })

      // Assert
      expect(result).toBe(undefined)
      expect(response.end).toHaveBeenCalled()
    })

    it('Must call onFinished callback instead of end', async () => {
      // Arrange
      const response = { end: jest.fn() }
      send.pipe = function () {
        this.events.file()
        onFinishedCallback()
        jest.runAllTimers()
      }

      // Act
      const result = await Utils.streamFile({}, response, { getEncodedFilePath: () => '' }, { headers: { host: 'host' } })

      // Assert
      expect(result).toBe(undefined)
      expect(response.end).not.toHaveBeenCalled()
    })

    it('Must call header callback', async () => {
      // Arrange
      send.pipe = function (response) {
        this.events.headers(response)
        this.events.file()
        this.events.stream()
        this.events.end()
        response.end()
      }

      // Act
      const result = await Utils.streamFile({}, response, { getEncodedFilePath: () => '' }, { headers: { host: 'host' } })

      // Assert
      expect(result).toBe(undefined)
      expect(response.end).toHaveBeenCalled()
      expect(response.setHeader).toHaveBeenCalled()
    })

    it('Must throw an error on error', async () => {
      // Arrange
      send.pipe = function (response) {
        this.events.error({ message: 'error', code: 'error' })
        response.end()
      }

      // Act
      try {
        const result = await Utils.streamFile({}, response, { getEncodedFilePath: () => '' }, { headers: { host: 'host' } })
        expect(result).toBe(true) // Failed check test
      } catch (error) {
        expect(response.end).toHaveBeenCalled()
        expect(error.message).toBe('error')
        expect(error.body).toBe('An unexpected error has occurred.')
      }
    })

    it('Must throw an error on directory request', async () => {
      // Arrange
      send.pipe = function (response) {
        this.events.directory()
        response.end()
      }

      // Act
      try {
        const result = await Utils.streamFile({}, response, { getEncodedFilePath: () => '' }, { headers: { host: 'host' } })
        expect(result).toBe(true) // Failed check test
      } catch (error) {
        expect(response.end).toHaveBeenCalled()
        expect(error.message).toBe('EISDIR, read')
        expect(error.body).toBe('This file cannot be found.')
      }
    })

    it('Must throw an error on connection reset', async () => {
      // Arrange
      send.pipe = function (response) {
        onFinishedCallback({ message: 'error', code: 'ECONNRESET' })
        response.end()
      }

      // Act
      try {
        const result = await Utils.streamFile({}, response, { getEncodedFilePath: () => '' }, { headers: { host: 'host' } })
        expect(result).toBe(true) // Failed check test
      } catch (error) {
        expect(response.end).toHaveBeenCalled()
        expect(error.body).toBe('Request aborted.')
        expect(error.message).toBe('Request aborted.')
      }
    })

    it('Must throw an error on an unexpected error', async () => {
      // Arrange
      send.pipe = function (response) {
        onFinishedCallback({ message: 'error' })
        response.end()
      }

      // Act
      try {
        const result = await Utils.streamFile({}, response, { getEncodedFilePath: () => '' }, { headers: { host: 'host' } })
        expect(result).toBe(true) // Failed check test
      } catch (error) {
        expect(response.end).toHaveBeenCalled()
        expect(error.message).toBe('error')
        expect(error.body).toBe('An unexpected error has occurred.')
      }
    })

    it('Must throw an error on when finished by still streaming', async () => {
      // Arrange
      send.pipe = function (response) {
        onFinishedCallback()
        jest.runAllTimers()
        response.end()
      }

      // Act
      try {
        const result = await Utils.streamFile({}, response, { getEncodedFilePath: () => '' }, { headers: { host: 'host' } })
        expect(result).toBe(true) // Failed check test
      } catch (error) {
        expect(response.end).toHaveBeenCalled()
        expect(error.body).toBe('Request aborted.')
        expect(error.message).toBe('Request aborted.')
      }
    })
  })
})
