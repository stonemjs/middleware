/**
 * Class representing a SendMiddleware.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class SendMiddleware {
  /**
   * Handle event result and transform it to platform-specific response.
   *
   * @param   {Passable} passable - Input data to transform via middleware.
   * @param   {Function} next - Pass to next middleware.
   * @returns {Passable}
   */
  handle (passable, next) {
    if (!passable.response.send) {
      if (passable.event.isMethod('HEAD')) {
        passable.response.send = () => passable.response.end()
      } else {
        passable.response.send = () => passable.response.end(passable.result.content, passable.result.charset)
      }
    }

    return next(passable)
  }
}
