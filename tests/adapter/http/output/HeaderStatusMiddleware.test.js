import statuses from 'statuses'
import { HeaderStatusMiddleware } from '../../../../src/adapter/http/output/HeaderStatusMiddleware.mjs'

describe('HeaderStatusMiddleware', () => {
  describe('#handle', () => {
    it('Must set status and headers when defined in result', () => {
      // Arrange
      const passable = {
        response: {
          headers: {},
          setHeaders (headers) {
            this.headers = headers
          }
        },
        result: {
          headers: {
            'Content-Type': 'application/json'
          },
          statusCode: 200,
          statusMessage: 'Ok'
        }
      }
      const middleware = new HeaderStatusMiddleware()

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.response.headers).toEqual(passable.result.headers)
      expect(output.response.statusCode).toEqual(passable.result.statusCode)
      expect(output.response.statusMessage).toEqual(passable.result.statusMessage)
    })

    it('Must set status and headers when not defined in result', () => {
      // Arrange
      const passable = {
        response: {
          headers: {},
          setHeaders (headers) {
            this.headers = headers
          }
        },
        result: {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      }
      const middleware = new HeaderStatusMiddleware()

      // Act
      const output = middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.response.headers).toEqual(passable.result.headers)
      expect(output.response.statusCode).toEqual(500)
      expect(output.response.statusMessage).toEqual(statuses.message[500])
    })
  })
})
