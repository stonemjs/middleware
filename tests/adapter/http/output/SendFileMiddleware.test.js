import { config } from '../../../Config.mock'
import { SendFileMiddleware } from '../../../../src/adapter/http/output/SendFileMiddleware.mjs'

jest.mock('../../../../src/utils.mjs', () => ({ streamFile: () => 'Done' }))

const BinaryFileResponse = class {
  constructor (statusCode, statusMessage, headers, file) {
    this.file = file
    this.headers = headers
    this.statusCode = statusCode
    this.statusMessage = statusMessage
  }

  getEncodedFilePath () {
    return '../files/image.png'
  }
}

jest.mock('@stone-js/http', () => ({
  BinaryFileResponse
}))

describe('SendFileMiddleware', () => {
  describe('#handle', () => {
    it('Must add send method when http verb is `head`', () => {
      // Arrange
      config.set({ 'app.adapter.files.download': {}, 'app.adapter.files.download.headers': {} })
      const passable = {
        response: { end: () => 'Stone' },
        event: {
          isMethod: jest.fn(() => true)
        },
        result: new BinaryFileResponse(200, 'ok', { 'Content-Type': 'application/json' })
      }
      const middleware = new SendFileMiddleware({ config })

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.response.send()).toBe('Stone')
      expect(passable.event.isMethod).toHaveBeenCalledWith('HEAD')
    })

    it('Must add send method when http verb is not `head`', () => {
      // Arrange
      config.set({ 'app.adapter.files.download': {}, 'app.adapter.files.download.headers': {} })
      const passable = {
        response: {},
        message: {},
        event: {
          isMethod: jest.fn(() => false)
        },
        result: new BinaryFileResponse(200, 'ok', { 'Content-Type': 'text/plain' }, { getContent: () => 'Hello' })
      }
      const middleware = new SendFileMiddleware({ config })

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.response.send()).toBe('Done')
      expect(passable.event.isMethod).toHaveBeenCalledWith('HEAD')
    })

    it('Must not add send method when already defined', () => {
      // Arrange
      config.set({ 'app.adapter.files.download': {}, 'app.adapter.files.download.headers': {} })
      const passable = {
        response: {
          send: () => 'ok'
        }
      }
      const middleware = new SendFileMiddleware({ config })

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.response.send()).toBe('ok')
    })
  })
})
