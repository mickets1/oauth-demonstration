import fetch from 'node-fetch'
import createError from 'http-errors'
import { randomBytes } from 'crypto'

/**
 * Oauth controller for GitLab API.
 */
export class OauthController {
  /**
   * Home page - passes url to the view.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express' next error middleware function.
   */
  async index (req, res, next) {
    try {
      const url = `https://gitlab.lnu.se/oauth/authorize?client_id=${process.env.APP_ID}&redirect_uri=${process.env.REDIRECT}&response_type=code&state=${req.session.csrf}&scope=${process.env.SCOPE}`
      res.render('index', { url, message: req.session.message })
    } catch (err) {
      next(err)
    }
  }

  /**
   * Acquire access token and adds to session.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express' next error middleware function.
   */
  async redirect (req, res, next) {
    try {
      const requestToken = req.query.code

      // Send request to GitLab by clients behalf.
      const url = `https://gitlab.lnu.se/oauth/token?client_id=${process.env.APP_ID}&client_secret=${process.env.APP_SECRET}&code=${requestToken}&grant_type=authorization_code&redirect_uri=${process.env.REDIRECT}`
      const oauth = await fetch(url, {
        method: 'POST',
        header: {
          accept: 'application/json'
        }
      })

      const response = await oauth.json()
      req.session.accessToken = response.access_token

      next()
    } catch (err) {
      next(err)
    }
  }

  /**
   * Render a welcoming user page with user details.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express' next error middleware function.
   */
  async userPage (req, res, next) {
    try {
      if (!req.session.accessToken) {
        req.session.message = 'Login Again'
        res.redirect('/')
      }

      const url = `https://gitlab.lnu.se/api/v4/user?access_token=${req.session.accessToken}`
      const oauth = await fetch(url, {
        method: 'GET',
        header: {
          accept: 'application/json'
        }
      })

      const profileInfo = await oauth.json()
      const activities = await this._userActivity(req, res, next)

      const userInfo = {
        id: profileInfo.id,
        name: profileInfo.name,
        username: profileInfo.username,
        email: profileInfo.email,
        avatar: profileInfo.avatar_url,
        profileUrl: profileInfo.web_url,
        last_activity: profileInfo.last_activity_on
      }

      res.render('userpage', { userInfo, activities })
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET and parse GitLab activities(events) - limit to 101.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express' next error middleware function.
   * @returns {object<Array>} activity array.
   */
  async _userActivity (req, res, next) {
    try {
      let activities = []

      // Two pages
      for (let index = 1; index < 3; index++) {
        const url = `https://gitlab.lnu.se/api/v4/events?per_page=100&page=${index}&access_token=${req.session.accessToken}`
        const response = await fetch(url, {
          method: 'GET',
          header: {
            accept: 'application/json'
          }
        })

        // Parse headers and check if theres a next page.
        const headers = Object.fromEntries(response.headers.entries())
        const nextPage = parseInt(headers['x-next-page'])
        if (nextPage === 2 || nextPage === 3) {
          activities.push(...await response.json())
        } else {
          activities.push(...await response.json())
          break
        }
      }

      if (activities.length > 101) {
        activities = activities.slice(0, 101)
      }

      return activities
    } catch (err) {
      next(err)
    }
  }

  /**
   * Validates CSRF token.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express' next error middleware function.
   */
  async validateCSRF (req, res, next) {
    // Replace whitespace with + in returned state token.
    const state = req.query.state.replace(/ /g, '+')

    if (state !== req.session.csrf) {
      next(createError(403))
    }

    next()
  }

  /**
   * Generates CSRF token and adds it to session.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express' next error middleware function.
   */
  async generateCSRF (req, res, next) {
    if (req.session.csrf === undefined) {
      req.session.csrf = randomBytes(100).toString('base64')
    }

    next()
  }
}
