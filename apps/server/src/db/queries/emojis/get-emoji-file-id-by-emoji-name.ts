import { eq } from 'drizzle-orm';
import { db } from '../..';
import { emojis } from '../../schema';

const getEmojiFileIdByEmojiName = async (
  name: string
): Promise<number | null> => {
  const result = await db
    .select({
      fileId: emojis.fileId
    })
    .from(emojis)
    .where(eq(emojis.name, name))
    .get();

  return result ? result.fileId : null;
};

export { getEmojiFileIdByEmojiName };
