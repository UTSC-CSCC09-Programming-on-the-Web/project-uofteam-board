import { db } from "../db";

export async function findUserByGoogleId(googleId: string) {
  const result = await db.query("SELECT * FROM users WHERE google_id = $1", [googleId]);
  return result.rows[0];
}

export async function createUser(data: {
  googleId: string;
  email: string;
  name: string;
}) {
  const result = await db.query(
    `INSERT INTO users (google_id, email, name) VALUES ($1, $2, $3) RETURNING *`,
    [data.googleId, data.email, data.name]
  );
  return result.rows[0];
}
