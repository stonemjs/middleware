import proxyAddr from 'proxy-addr'
import { isIpTrusted } from '../../../utils.mjs'

/**
 * Class representing an IpMiddleware.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class IpMiddleware {
  /**
   * Create an IpMiddleware.
   *
   * @param {Container} container
   * @param {Config} container.config
   */
  constructor ({ config }) {
    const proxy = config.get('app.adapter.proxy', { trusted: [], untrusted: [] })

    this._trusted = proxy.trusted
    this._untrusted = proxy.untrusted
  }

  /**
   * Handle platform-specific message and transform it to Stone.js IncomingEvent or HTTPEvent.
   *
   * @param   {Passable} passable - Input data to transform via middleware.
   * @param   {Function} next - Pass to next middleware.
   * @returns {Passable}
   */
  handle (passable, next) {
    const isTrusted = isIpTrusted(this._trusted, this._untrusted)
    // Return all ips including `message.connection.remoteAddress`, then remove it.
    const addrs = proxyAddr.all(passable.message, isTrusted).filter((_, i) => i > 0)

    passable.event.ips = addrs.reverse()
    passable.event.ip = proxyAddr(passable.message, isTrusted)

    return next(passable)
  }
}
