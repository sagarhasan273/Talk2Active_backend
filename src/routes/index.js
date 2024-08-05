const express = require('express');


const router = express.Router();

router.use('/user', require('./userRouter'));
router.use('/auth', require('./authentication'));

module.exports = router;