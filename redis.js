
const redis = require('redis'); 
require("dotenv").config();

const dbclient = redis.createClient({
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    socket: {
        host: process.env.DB_HOSTNAME,
        port: process.env.DB_PORT
    }
});

dbclient.on('error', err => console.log('Redis Client Error', err));

module.exports = dbclient;


