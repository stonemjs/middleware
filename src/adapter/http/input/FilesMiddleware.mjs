import { isMultipart, getFilesFromMessage } from '../../../utils.mjs'

/**
 * Class representing a FilesMiddleware.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class FilesMiddleware {
  /**
   * Create a FilesMiddleware.
   *
   * @param {Container} container
   * @param {Config} container.config
   */
  constructor ({ config }) {
    this._options = config.get('app.adapter.files.upload', {})
  }

  /**
   * Handle platform-specific message and transform it to Stone.js IncomingEvent or HTTPEvent.
   *
   * @param   {Passable} passable - Input data to transform via middleware.
   * @param   {Function} next - Pass to next middleware.
   * @returns {Passable}
   */
  async handle (passable, next) {
    if (isMultipart(passable.message)) {
      const response = await getFilesFromMessage(passable.message, this._options)
      passable.event.files = response.files
      passable.event.body = response.fields
    }

    return next(passable)
  }
}
