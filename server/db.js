const { Pool } = require('pg');

const pool = new Pool({
    host: "aws-0-ap-southeast-1.pooler.supabase.com",
    user: "postgres.ghpujaracnfanfjasaks",
    password: "FRy8aNDisIJ3MR4T",
    database: "postgres",
    port: 6543,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('Lỗi kết nối cơ sở dữ liệu:', err);
});

module.exports = pool;