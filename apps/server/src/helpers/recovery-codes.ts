import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { recoveryCodes } from '../db/schema';

const RECOVERY_CODE_COUNT = 8;
const MAX_FAILED_ATTEMPTS = 10;

const generateCode = (): string => {
  return crypto.randomBytes(16).toString('hex'); // 32 hex chars, 128 bits
};

const hashCode = async (code: string): Promise<string> => {
  return (await Bun.password.hash(code)).toString();
};

const generateRecoveryCodes = async (userId: number): Promise<string[]> => {
  await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));

  const codes: string[] = [];
  const now = Date.now();

  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const code = generateCode();
    codes.push(code);

    await db.insert(recoveryCodes).values({
      userId,
      codeHash: await hashCode(code),
      createdAt: now
    });
  }

  return codes;
};

const verifyRecoveryCode = async (
  userId: number,
  code: string
): Promise<boolean> => {
  const unused = await db
    .select()
    .from(recoveryCodes)
    .where(eq(recoveryCodes.userId, userId))
    .all();

  const unusedCodes = unused.filter((c) => !c.used);

  // Constant-time: always verify against all unused codes
  let matchedId: number | null = null;
  for (const row of unusedCodes) {
    const matches = await Bun.password.verify(code, row.codeHash);
    if (matches && matchedId === null) {
      matchedId = row.id;
    }
  }

  if (matchedId !== null) {
    // Valid code — mark used, reset failed attempts
    await db
      .update(recoveryCodes)
      .set({ used: true, usedAt: Date.now() })
      .where(eq(recoveryCodes.id, matchedId));
    await db
      .update(recoveryCodes)
      .set({ failedAttempts: 0 })
      .where(eq(recoveryCodes.userId, userId));
    return true;
  }

  // Invalid attempt — increment failed counter on all unused codes
  const failedCount = (unusedCodes[0]?.failedAttempts ?? 0) + 1;

  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    // Invalidate all remaining codes
    await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
  } else {
    for (const row of unusedCodes) {
      await db
        .update(recoveryCodes)
        .set({ failedAttempts: failedCount })
        .where(eq(recoveryCodes.id, row.id));
    }
  }

  return false;
};

const getRemainingCodeCount = async (userId: number): Promise<number> => {
  const codes = await db
    .select()
    .from(recoveryCodes)
    .where(eq(recoveryCodes.userId, userId))
    .all();

  return codes.filter((c) => !c.used).length;
};

export { generateRecoveryCodes, getRemainingCodeCount, verifyRecoveryCode };
