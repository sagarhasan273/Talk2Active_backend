const mongoose = require('mongoose');

const FeedsSchema = new mongoose.Schema({
    postType: {
        type: String,
        required: true,
    },
    quoteText: {
        type: String,
        default: '',
    },
    quoteAuthor: {
        type: String,
        default: '',
    },
    quoteBgImage: {
        type: String,
        default: '',
    },
    storyText: {
        type: String,
        default: '',
    },
    mediaText: {
        type: String,
        default: '',
    },
    mediaImage: {
        type: String,
        default: '',
    },
    mediaCaption: {
        type: String,
        default: '',
    },
    userId: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Feeds', FeedsSchema);