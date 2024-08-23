const express = require('express');
const multer = require('multer');
const uploadImageToFreeImageHost = require('../controllers/uploadImageToFreeImageHost');

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Route to handle image upload
router.post('/upload', upload.single('image'), uploadImageToFreeImageHost);

module.exports = router;