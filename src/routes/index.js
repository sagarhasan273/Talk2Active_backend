const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    res.send('Welcome to Talk2Active Backend');
});
router.use('/auth', require('./authentication'));

module.exports = router;