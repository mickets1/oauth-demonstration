import express from 'express'
import { OauthController } from '../controllers/oauth-controller.js'

export const router = express.Router()

const oauthController = new OauthController()

router.get('/', oauthController.generateCSRF, oauthController.index)
router.get('/callback', oauthController.redirect, oauthController.validateCSRF, (req, res, next) => oauthController.userPage(req, res, next))
