import { SendMiddleware } from '../../../../src/adapter/http/output/SendMiddleware.mjs'

describe('SendMiddleware', () => {
  describe('#handle', () => {
    it('Must add send method when http verb is `head`', () => {
      // Arrange
      const passable = {
        response: {
          end: () => 'ok'
        },
        event: {
          isMethod: jest.fn(() => true)
        }
      }
      const middleware = new SendMiddleware()

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.response.send()).toBe('ok')
      expect(passable.event.isMethod).toHaveBeenCalledWith('HEAD')
    })

    it('Must add send method when http verb is not `head`', () => {
      // Arrange
      const passable = {
        response: {
          end: (content, charset) => `${content} ${charset}`
        },
        event: {
          isMethod: jest.fn(() => false)
        },
        result: {
          charset: 'utf8',
          content: 'ok'
        }
      }
      const middleware = new SendMiddleware()

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.response.send()).toBe('ok utf8')
      expect(passable.event.isMethod).toHaveBeenCalledWith('HEAD')
    })

    it('Must not add send method when already defined', () => {
      // Arrange
      const passable = {
        response: {
          send: () => 'ok'
        }
      }
      const middleware = new SendMiddleware()

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.response.send()).toBe('ok')
    })
  })
})
