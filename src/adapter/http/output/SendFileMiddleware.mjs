import { streamFile } from '../../../utils.mjs'
import { BinaryFileResponse } from '@stone-js/http'

/**
 * Class representing a SendFileMiddleware.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class SendFileMiddleware {
  /**
   * Create a SendFileMiddleware.
   *
   * @param {Container} container
   * @param {Config} container.config
   * @param {Object} container.errorHandler
   */
  constructor ({ config }) {
    this._options = config.get('app.adapter.files.download', {})
  }

  /**
   * Handle event result and transform it to platform-specific response.
   *
   * @param   {Passable} passable - Input data to transform via middleware.
   * @param   {Function} next - Pass to next middleware.
   * @returns {Passable}
   */
  handle (passable, next) {
    if (passable.result instanceof BinaryFileResponse) {
      if (passable.event.isMethod('HEAD')) {
        passable.response.send = () => passable.response.end()
      } else {
        passable.response.send = () => streamFile(passable.message, passable.response, passable.result, this._options)
      }
    }

    return next(passable)
  }
}
