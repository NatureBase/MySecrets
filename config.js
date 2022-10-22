require("dotenv").config({path: "./.env"});
const cfg = {
    port: process.env.PORT || 3000,
    mongoUsername: process.env.MONGO_DB_USERNAME,
    mongoPassword: process.env.MONGO_DB_PASSWORD,
    sessionSecret: process.env.SESSION_SECRET,
    googleAuth: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    facebookAuth: {
        appId: process.env.FACEBOOK_APP_ID,
        appSecret: process.env.FACEBOOK_APP_SECRET
    }
};

module.exports = cfg;