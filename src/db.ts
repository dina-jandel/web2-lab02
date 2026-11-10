import "dotenv/config";
import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gallery (
      id SERIAL PRIMARY KEY,
      link TEXT NOT NULL,
      stored TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    )
  `);

  await pool.query(`
    INSERT INTO users (username, password, role) VALUES
      ('admin', 'admin123', 'admin'),
      ('marko', 'marko123', 'user'),
      ('ana',   'ana123',   'user')
    ON CONFLICT (username) DO NOTHING
  `);
}