import { config } from '../../../Config.mock'
import { FilesMiddleware } from '../../../../src/adapter/http/input/FilesMiddleware.mjs'

jest.mock('../../../../src/utils.mjs', () => ({
  isMultipart: ({ headers }) => headers['content-type']?.includes('multipart/form-data'),
  getFilesFromMessage: () => ({ files: [{ filename: 'photo.png' }], fields: { name: 'Jonh' } })
}))

describe('FilesMiddleware', () => {
  describe('#handle', () => {
    const passable = {
      event: {},
      message: {
        headers: {
          'content-length': 0,
          'content-type': 'multipart/form-data; boundary=---------------------------123456789012345678901234567890'
        }
      }
    }

    it('Must return uloaded files', async () => {
      // Arrange
      config.set({ 'app.adapter.files.upload': {} })
      const middleware = new FilesMiddleware({ config })

      // Act
      const output = await middleware.handle(passable, (stack) => stack)

      // Assert
      expect(output.event.files).toEqual([{ filename: 'photo.png' }])
      expect(output.event.body).toEqual({ name: 'Jonh' })
    })

    it('Must return empty when body is empty', async () => {
      // Arrange
      config.set({ 'app.adapter.files.upload': {} })
      const middleware = new FilesMiddleware({ config })

      // Act
      const output = await middleware.handle({ event: {}, message: { headers: {} } }, (stack) => stack)

      // Assert
      expect(output.event.body).toBeUndefined()
      expect(output.event.files).toBeUndefined()
    })
  })
})
