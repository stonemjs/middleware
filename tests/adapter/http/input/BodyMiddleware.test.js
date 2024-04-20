import bodyParser from 'co-body'
import { config } from '../../../Config.mock'
import { BodyMiddleware } from '../../../../src/adapter/http/input/BodyMiddleware.mjs'

jest.mock('raw-body', () => jest.fn(() => 'rawbody'))
jest.mock('co-body', () => ({
  json: jest.fn(() => ({ name: 'Stone' })),
  text: jest.fn(() => 'Stone'),
  form: jest.fn(() => ({ name: 'Stone' }))
}))

describe('BodyMiddleware', () => {
  config.set({ 'app.adapter.body': { limit: '100kb', defaultType: 'text/plain', defaultCharset: 'utf-8' } })

  describe('#handle', () => {
    it('Must return body in different format', async () => {
      // Arrange
      const middleware = new BodyMiddleware({ config })
      const message = { headers: { 'content-type': 'application/json', 'content-length': 0 } }
      const message2 = { headers: { 'content-type': 'text/plain; charset=utf-8', 'content-length': 0 } }
      const message3 = { headers: { 'content-type': 'application/octet-stream', 'content-length': 0 } }
      const message4 = { headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': 0 } }
      const message5 = { headers: { 'content-type': 'application/json' } }
      const message6 = { headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': 0 } }
      const message7 = { headers: { 'content-type': 'multipart/form-data; boundary=--99', 'content-length': 0 } }

      // Act
      const output = await middleware.handle({ event: {}, message }, (stack) => stack)
      const output2 = await middleware.handle({ event: {}, message: message2 }, (stack) => stack)
      const output3 = await middleware.handle({ event: {}, message: message3 }, (stack) => stack)
      const output4 = await middleware.handle({ event: {}, message: message4 }, (stack) => stack)
      const output5 = await middleware.handle({ event: {}, message: message5 }, (stack) => stack)
      const output6 = await middleware.handle({ event: {}, message: message6 }, (stack) => stack)
      const output7 = await middleware.handle({ event: {}, message: message7 }, (stack) => stack)

      // Assert
      expect(output2.event.body).toBe('Stone')
      expect(output.event.body).toEqual({ name: 'Stone' })
      expect(output3.event.body).toBe('rawbody')
      expect(output4.event.body).toEqual({ name: 'Stone' })
      expect(output5.event.body).toEqual({})
      expect(output6.event.body).toEqual({})
      expect(output7.event.body).toBeUndefined()
    })

    it('Must throw an error when body is invalid', async () => {
      // Arrange
      bodyParser.json = jest.fn(() => { throw new TypeError('body content too big') })
      const middleware = new BodyMiddleware({ config })
      const message = { headers: { 'content-type': 'application/json', 'content-length': 0 } }

      try {
        // Act
        const output = await middleware.handle({ event: {}, message }, (stack) => stack)
        expect(output).toBe(true)
      } catch (error) {
        expect(error.body).toBe('Invalid body.')
        expect(error.message).toBe('body content too big')
      }
    })
  })
})
