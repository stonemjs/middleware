import { config } from '../../../Config.mock'
import { IpMiddleware } from '../../../../src/adapter/http/input/IpMiddleware.mjs'

describe('IpMiddleware', () => {
  describe('#handle', () => {
    const passable = {
      event: {},
      message: {
        socket: {
          remoteAddress: '127.0.0.1'
        },
        headers: {
          'x-forwarded-for': '223.19.23.0, 125.19.23.0, 125.19.23.55, 125.19.23.60'
        }
      }
    }

    it('Must return user proxied ips when they are trusted', () => {
      // Arrange
      config.set({ 'app.adapter.proxy': { trusted: ['127.0.0.1', '125.19.23.0/24'], untrusted: [] } })
      const middleware = new IpMiddleware({ config })

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.event.ip).toBe('223.19.23.0')
      expect(output.event.ips).toEqual(['223.19.23.0', '125.19.23.0', '125.19.23.55', '125.19.23.60'])
    })

    it('Must return remoteAddress ip when untrusted', () => {
      // Arrange
      config.set({ 'app.adapter.proxy': { trusted: ['125.19.23.0/24'], untrusted: [] } })
      const middleware = new IpMiddleware({ config })

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.event.ip).toBe('127.0.0.1')
      expect(output.event.ips).toEqual([])
    })

    it('Must return remoteAddress ip when no options provided', () => {
      // Arrange
      config.set({ 'app.adapter.proxy': { trusted: [], untrusted: [] } })
      const middleware = new IpMiddleware({ config })

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.event.ip).toBe('127.0.0.1')
      expect(output.event.ips).toEqual([])
    })
  })
})
