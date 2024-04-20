import { config } from '../../../Config.mock'
import { CommonMiddleware } from '../../../../src/adapter/http/input/CommonMiddleware.mjs'

describe('CommonMiddleware', () => {
  describe('#handle', () => {
    const passable = {
      event: {},
      response: {
        send: () => 'output'
      },
      message: {
        method: 'GET',
        encrypted: true,
        url: '/user?name=jonh',
        socket: {
          remoteAddress: '127.0.0.1'
        },
        headers: {
          host: 'www.example.com',
          cookie: 'name=Stone; version=1.0.0',
          'x-forwarded-host': 'www.dev.example.com',
          'x-forwarded-proto': 'https'
        }
      }
    }

    it('Must return common event items', () => {
      // Arrange
      config.set({ 'app.adapter.proxy': { trusted: ['127.0.0.1', '125.19.23.0/24'], untrusted: [] } })
      const middleware = new CommonMiddleware({ config })

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.event.method).toBe('GET')
      expect(output.event.protocol).toBe('https')
      expect(output.event.metadata.node.message.encrypted).toBe(true)
      expect(output.event.metadata.node.response.send()).toBe('output')
      expect(output.event.headers['x-forwarded-host']).toBe('www.dev.example.com')
      expect(output.event.cookies.all()).toEqual({ name: 'Stone', version: '1.0.0' })
    })
  })
})
