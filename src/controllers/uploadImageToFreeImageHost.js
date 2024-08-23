const  axios  = require("axios");
const https = require('https');

const agent = new https.Agent({  
  rejectUnauthorized: false
});

const uploadImageToFreeImageHost = async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('image', req.file.path);
    formData.append('key', process.env.UPLOAD_IMAGE_HOST_KEY);

    const response = await axios.post(process.env.UPLOAD_IMAGE_HOST_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      httpsAgent: agent,  // Attach the agent here
    });

    return res.json({ status: true, imageUrl: response.data.image.url, message: 'Image uploaded to the host.' });
  } catch (err) {
    return res.json({ status: false, message: err });
  }
};
module.exports = uploadImageToFreeImageHost;
