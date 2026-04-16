import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { recoveryCodes } from '../db/schema';

const RECOVERY_CODE_COUNT = 8;

const generateCode = (): string => {
  return crypto.randomBytes(4).toString('hex'); // 8 hex chars, e.g. "a1b2c3d4"
};

const hashCode = async (code: string): Promise<string> => {
  return (await Bun.password.hash(code)).toString();
};

const generateRecoveryCodes = async (
  userId: number
): Promise<string[]> => {
  // Delete any existing codes for this user
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

  for (const row of unusedCodes) {
    const matches = await Bun.password.verify(code, row.codeHash);
    if (matches) {
      await db
        .update(recoveryCodes)
        .set({ used: true, usedAt: Date.now() })
        .where(eq(recoveryCodes.id, row.id));
      return true;
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

export {
  generateRecoveryCodes,
  getRemainingCodeCount,
  verifyRecoveryCode
};
