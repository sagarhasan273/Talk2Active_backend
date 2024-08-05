const express = require('express');

const router = express.Router();

router.use('/status', require('./updateActiveStatus'))

module.exports = router;