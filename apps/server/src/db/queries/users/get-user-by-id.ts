import { type TJoinedUser } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '../..';
import { files, userRoles, users } from '../../schema';

const getUserById = async (
  userId: number
): Promise<TJoinedUser | undefined> => {
  const avatarFiles = alias(files, 'avatarFiles');
  const bannerFiles = alias(files, 'bannerFiles');

  const user = await db
    .select({
      id: users.id,
      identity: users.identity,
      name: users.name,
      avatarId: users.avatarId,
      bannerId: users.bannerId,
      bio: users.bio,
      password: users.password,
      bannerColor: users.bannerColor,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
      banned: users.banned,
      banReason: users.banReason,
      bannedAt: users.bannedAt,
      avatar: avatarFiles,
      banner: bannerFiles
    })
    .from(users)
    .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
    .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
    .where(eq(users.id, userId))
    .get();

  if (!user) return undefined;

  const roles = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .all();

  return {
    ...user,
    avatar: user.avatar,
    banner: user.banner,
    roleIds: roles.map((r) => r.roleId)
  };
};

export { getUserById };
