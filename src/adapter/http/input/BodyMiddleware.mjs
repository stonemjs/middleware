import bytes from 'bytes'
import typeIs from 'type-is'
import rawBody from 'raw-body'
import bodyParser from 'co-body'
import { HttpError } from '@stone-js/common'
import { isMultipart, getCharset } from '../../../utils.mjs'

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
 * Class representing a BodyMiddleware.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class BodyMiddleware {
  /**
   * Create a BodyMiddleware.
   *
   * @param {Container} container
   * @param {Config} container.config
   */
  constructor ({ config }) {
    const body = config.get('app.adapter.body', {
      limit: '100kb',
      defaultCharset: 'utf-8',
      defaultType: 'text/plain'
    })

    this._limit = body.limit
    this._defaultType = body.defaultType
    this._defaultCharset = body.defaultCharset
  }

  /**
   * Handle platform-specific message and transform it to Stone.js IncomingEvent or HTTPEvent.
   *
   * @param   {Passable} passable - Input data to transform via middleware.
   * @param   {Function} next - Pass to next middleware.
   * @returns {Passable}
   */
  async handle (passable, next) {
    if (!isMultipart(passable.message)) {
      passable.event.body = await this.#getBody(passable.message)
    }

    return next(passable)
  }

  async #getBody (message) {
    if (!typeIs.hasBody(message)) {
      return {}
    }

    const limit = bytes.parse(this._limit)
    const length = message.headers['content-length']
    const encoding = getCharset(message, this._defaultCharset)

    try {
      switch (typeIs(message, ['urlencoded', 'json', 'text', 'bin'])) {
        case 'bin':
          return await rawBody(message, { length, limit })
        case 'json':
          return await bodyParser.json(message, { limit, encoding })
        case 'text':
          return await bodyParser.text(message, { limit, encoding })
        case 'urlencoded':
          return await bodyParser.form(message, { limit, encoding })
        default:
          return {}
      }
    } catch (error) {
      throw new HttpError(
        400,
        'Invalid body.',
        error.message,
        { code: error.code, cause: error }
      )
    }
  }
}
