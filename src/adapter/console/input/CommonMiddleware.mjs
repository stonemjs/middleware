/**
 * Class representing a CommonMiddleware.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class CommonMiddleware {
  /**
   * Handle platform-specific message and transform it to Stone.js IncomingEvent.
   *
   * @param   {Passable} passable - Input data to transform via middleware.
   * @param   {Function} next - Pass to next middleware.
   * @returns {Passable}
   */
  handle (passable, next) {
    passable.event.metadata = passable.message
    passable.event.metadata.task = passable.message._extra.shift()
    return next(passable)
  }
}
