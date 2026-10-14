const mongoose = require('mongoose');
const path = require('path');
if (!process.env.DB_CONNECT_STRING) {
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}
const dns = require('dns');

// On Windows, Node DNS often fails to resolve SRV records (_mongodb._tcp.xxx)
// Setting standard Google & Cloudflare DNS servers fixes querySrv ECONNREFUSED
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
    console.error('DNS setServers error:', err);
}

async function main() {
    await mongoose.connect(process.env.DB_CONNECT_STRING);
}

module.exports = main;
