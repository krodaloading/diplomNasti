// test-db.js
require('dotenv').config();

console.log('PGHOST:', process.env.PGHOST);
console.log('PGPORT:', process.env.PGPORT);
console.log('PGUSER:', process.env.PGUSER);
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '***' : undefined);
console.log('PGDATABASE:', process.env.PGDATABASE);

const { Client } = require('pg');

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: {
    rejectUnauthorized: false
  }
});

async function test() {
  try {
    await client.connect();
    console.log('✅ Успешное подключение к базе данных PostgreSQL!');
    await client.end();
  } catch (err) {
    console.error('❌ Ошибка подключения:', err);
  }
}

test();
