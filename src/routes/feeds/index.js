const express = require('express');
const Feeds = require('../../models/Feeds');

const router = express.Router();

router.get('/', async () => {
    const feeds = await Feeds.find();
    console.log(feeds);
});

router.use('/publish', require('./publishFeeds'));


module.exports = router;