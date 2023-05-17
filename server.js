import express from 'express'
import 'dotenv/config'
import { router } from './routes/router.js'
import session from 'express-session'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

mainSetup()

/**
 * Express init and server.
 */
async function mainSetup () {
  try {
    const app = express()
    const directoryFullName = dirname(fileURLToPath(import.meta.url))

    app.set(join(directoryFullName, 'views'))
    app.set(join(directoryFullName, 'views', 'partials'))
    app.set('view engine', 'pug')

    app.use(express.urlencoded({ extended: false }))

    app.use(express.static(join(directoryFullName, 'views', 'errors')))

    const sessionOptions = {
      name: process.env.SESSION_NAME,
      secret: 'process.env.SESSION_SECRET',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        sameSite: 'lax'
      }
    }

    app.use(session(sessionOptions))

    app.use('/', router)

    // Error handler.
    app.use(function (err, req, res, next) {
      // 404 Not Found.
      if (err.status === 404) {
        return res
          .status(404)
          .sendFile(join(directoryFullName, 'views', 'errors', '404.html'))
      }

      // 500 Internal Server Error (in production, all other errors send this response).
      return res
        .status(500)
        .sendFile(join(directoryFullName, 'views', 'errors', '500.html'))
    })

    app.listen(process.env.PORT, () => {
      console.log(`Server running at http://localhost:${process.env.PORT}`)
      console.log('Press Ctrl-C to terminate...')
    })
  } catch (error) {
    console.error(error)
  }
}
