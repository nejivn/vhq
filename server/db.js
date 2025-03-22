const { Pool } = require('pg');

const pool = new Pool({
    host: "poignantly-droll-chamois.data-1.use1.tembo.io",
    user: "postgres",
    password: "0YOdJV9QB2iit6Cn",
    database: "public",
    port: 5432
});

module.exports = pool;
