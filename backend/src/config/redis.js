const { createClient } = require('redis');

const path = require('path');
if (!process.env.REDIS_PASS) {
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}
const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'redis-19934.c212.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 19934
    }
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

module.exports = redisClient;