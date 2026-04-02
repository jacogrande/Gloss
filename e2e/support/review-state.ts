import { Pool } from "pg";

const defaultDatabaseUrl = "postgresql://gloss:gloss@127.0.0.1:54329/gloss";

export const promoteSeedToRecallReady = async (input: {
  email: string;
  word: string;
}): Promise<void> => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  });

  try {
    const result = await pool.query<{
      seed_id: string;
      user_id: string;
    }>(
      `
        SELECT s.id AS seed_id, u.id AS user_id
        FROM seeds s
        INNER JOIN "user" u ON u.id = s.user_id
        WHERE u.email = $1
          AND LOWER(s.word) = LOWER($2)
        ORDER BY s.created_at DESC
        LIMIT 1
      `,
      [input.email, input.word],
    );
    const row = result.rows[0];

    if (!row) {
      throw new Error(
        `Unable to find a saved seed for ${input.email} / ${input.word}.`,
      );
    }

    await pool.query(
      `
        DELETE FROM review_sessions
        WHERE user_id = $1
          AND status = 'active'
      `,
      [row.user_id],
    );

    await pool.query(
      `
        INSERT INTO review_states (
          id,
          seed_id,
          user_id,
          recognition_score,
          distinction_score,
          usage_score,
          recognition_due_at,
          distinction_due_at,
          usage_due_at,
          last_reviewed_at,
          last_session_id,
          scheduler_version
        )
        VALUES (
          $1, $2, $3,
          2, 1, 1,
          NOW() - INTERVAL '2 hours',
          NOW() + INTERVAL '2 days',
          NOW() + INTERVAL '2 days',
          NOW(),
          NULL,
          'review-scheduler.v1'
        )
        ON CONFLICT (seed_id, user_id)
        DO UPDATE SET
          recognition_score = EXCLUDED.recognition_score,
          distinction_score = EXCLUDED.distinction_score,
          usage_score = EXCLUDED.usage_score,
          recognition_due_at = EXCLUDED.recognition_due_at,
          distinction_due_at = EXCLUDED.distinction_due_at,
          usage_due_at = EXCLUDED.usage_due_at,
          last_reviewed_at = EXCLUDED.last_reviewed_at,
          last_session_id = EXCLUDED.last_session_id,
          scheduler_version = EXCLUDED.scheduler_version,
          updated_at = NOW()
      `,
      [`e2e_review_state_${crypto.randomUUID()}`, row.seed_id, row.user_id],
    );
  } finally {
    await pool.end();
  }
};
