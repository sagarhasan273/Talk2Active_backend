const express = require('express');

const router = express.Router();

router.use('/user', require('./auth.user'))

module.exports = router;