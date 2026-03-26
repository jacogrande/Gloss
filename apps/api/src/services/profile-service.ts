import { eq } from "drizzle-orm";

import { profilesTable, type ProfileRow } from "../db/schema";
import type { GlossDatabase } from "../lib/db";

export type ProfileService = {
  ensureProfile: (userId: string) => Promise<ProfileRow>;
  getProfileByUserId: (userId: string) => Promise<ProfileRow | null>;
};

export const createProfileService = (
  db: GlossDatabase,
): ProfileService => ({
  async ensureProfile(userId) {
    const [createdProfile] = await db
      .insert(profilesTable)
      .values({ userId })
      .onConflictDoNothing()
      .returning();

    if (createdProfile) {
      return createdProfile;
    }

    const existingProfile = await db.query.profilesTable.findFirst({
      where: eq(profilesTable.userId, userId),
    });

    if (!existingProfile) {
      throw new Error(`Profile missing after upsert for user ${userId}.`);
    }

    return existingProfile;
  },
  async getProfileByUserId(userId) {
    return (
      (await db.query.profilesTable.findFirst({
        where: eq(profilesTable.userId, userId),
      })) ?? null
    );
  },
});
