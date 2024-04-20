import statuses from 'statuses'

/**
 * Input data to transform via middleware.
 *
 * @typedef  Passable
 * @property {Object} message - Incomming message.
 * @property {Object} response - Outgoing response.
 * @property {Object} event - IncomingEvent's constructor options.
 * @property {Object} result - Result after processing the IncomingEvent.
 */

/**
 * Class representing an HeaderStatusMiddleware.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class HeaderStatusMiddleware {
  /**
   * Handle event result and transform it to platform-specific response.
   *
   * @param   {Passable} passable - Input data to transform via middleware.
   * @param   {Function} next - Pass to next middleware.
   * @returns {Passable}
   */
  handle (passable, next) {
    this
      .#setStatus(passable.response, passable.result)
      .#setResHeaders(passable.response, passable.result)

    return next(passable)
  }

  #setStatus (response, result) {
    response.statusCode = result.statusCode ?? 500
    response.statusMessage = result.statusMessage ?? statuses.message[response.statusCode]

    return this
  }

  #setResHeaders (response, result) {
    response.setHeaders(result.headers)

    return this
  }
}
