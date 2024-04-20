import { URL } from 'node:url'
import { getHostname, getProtocol } from '../../../utils.mjs'

/**
 * Class representing an HostMiddleware.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class HostMiddleware {
  /**
   * Create an HostMiddleware.
   *
   * @param {Container} container
   * @param {Config} container.config
   */
  constructor ({ config }) {
    const domain = config.get('app.adapter.domain', { trusted: [] })
    const proxy = config.get('app.adapter.proxy', { trusted: [], untrusted: [] })

    this._options = {
      trusted: domain.trusted,
      trustedIp: proxy.trusted,
      untrustedIp: proxy.untrusted
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
    const url = this.#getUrl(passable.message)

    passable.event.url = url
    passable.event.queryString = url.search

    return next(passable)
  }

  #getUrl (message) {
    const hostname = getHostname(message.socket.remoteAddress, message.headers, this._options)
    const proto = getProtocol(message.socket.remoteAddress, message.headers, message.socket.encrypted, this._options)
    return new URL(message.url, `${proto}://${hostname}`)
  }
}
