import express from 'express'
import createError from 'http-errors'
import { router as oauthRouter } from './oauth-router.js'

export const router = express.Router()

router.use('/', oauthRouter)

// Catch 404 (ALWAYS keep this as the last route).
router.use('*', (req, res, next) => next(createError(404)))
