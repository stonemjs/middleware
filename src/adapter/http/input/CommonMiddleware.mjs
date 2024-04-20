import { getProtocol } from '../../../utils.mjs'
import { CookieCollection } from '@stone-js/http'

/**
 * Class representing a CommonMiddleware.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class CommonMiddleware {
  /**
   * Create a CommonMiddleware.
   *
   * @param {Container} container
   * @param {Config} container.config
   */
  constructor ({ config }) {
    const cookie = config.get('app.adapter.cookie', { options: {} })
    const proxy = config.get('app.adapter.proxy', { trusted: [], untrusted: [] })

    this._options = {
      trustedIp: proxy.trusted,
      untrustedIp: proxy.untrusted
    }
    this._cookie = {
      options: cookie.options,
      secret: cookie.secret ?? config.get('secret', null)
    }
  }

  /**
   * Handle platform-specific message and transform it to Stone.js IncomingEvent or HTTPEvent.
   *
   * @param   {Passable} passable - Input data to transform via middleware.
   * @param   {Function} next - Pass to next middleware.
   * @returns {Passable}
   */
  handle (passable, next) {
    passable.event.metadata ??= {}
    passable.event.method = passable.message.method
    passable.event.headers = passable.message.headers
    passable.event.protocol = this.#getProtocol(passable.message)
    passable.event.metadata.node = { message: passable.message, response: passable.response }
    passable.event.cookies = CookieCollection.create(passable.message.headers.cookie, this._cookie.options, this._cookie.secret)

    return next(passable)
  }

  #getProtocol (message) {
    return getProtocol(message.socket.remoteAddress, message.headers, message.socket.encrypted, this._options)
  }
}
