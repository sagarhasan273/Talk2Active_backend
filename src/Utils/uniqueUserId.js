const crypto = require('crypto');

const generateUserId = (length = 10) => crypto.randomBytes(length).toString('base64').slice(0, length).replace(/\+/g, '0').replace(/\//g, '0');

const uniqueUserId = async (usersCollection, length = 10) => {
    const userId = generateUserId(length);
    const existingUser = await usersCollection.findOne({ userId });
    if (!existingUser) {
      return userId;
    } 
      return uniqueUserId(usersCollection, length);
    
  };

module.exports = uniqueUserId;