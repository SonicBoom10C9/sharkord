import type { TJoinedPublicUser } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '../..';
import { files, userRoles, users } from '../../schema';

const getPublicUsers = async (
  returnIdentity: boolean = false
): Promise<TJoinedPublicUser[]> => {
  const avatarFiles = alias(files, 'avatarFiles');
  const bannerFiles = alias(files, 'bannerFiles');

  if (returnIdentity) {
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        bannerColor: users.bannerColor,
        bio: users.bio,
        banned: users.banned,
        avatarId: users.avatarId,
        bannerId: users.bannerId,
        avatar: avatarFiles,
        banner: bannerFiles,
        createdAt: users.createdAt,
        _identity: users.identity
      })
      .from(users)
      .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
      .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
      .all();

    const rolesByUser = await db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId
      })
      .from(userRoles)
      .all();

    const rolesMap = rolesByUser.reduce(
      (acc, { userId, roleId }) => {
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(roleId);
        return acc;
      },
      {} as Record<number, number[]>
    );

    return results.map((result) => ({
      id: result.id,
      name: result.name,
      bannerColor: result.bannerColor,
      bio: result.bio,
      banned: result.banned,
      avatarId: result.avatarId,
      bannerId: result.bannerId,
      avatar: result.avatar,
      banner: result.banner,
      createdAt: result.createdAt,
      _identity: result._identity,
      roleIds: rolesMap[result.id] || []
    }));
  } else {
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        banned: users.banned,
        bannerColor: users.bannerColor,
        bio: users.bio,
        avatarId: users.avatarId,
        bannerId: users.bannerId,
        avatar: avatarFiles,
        banner: bannerFiles,
        createdAt: users.createdAt
      })
      .from(users)
      .leftJoin(avatarFiles, eq(users.avatarId, avatarFiles.id))
      .leftJoin(bannerFiles, eq(users.bannerId, bannerFiles.id))
      .all();

    // Get role IDs for all users
    const rolesByUser = await db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId
      })
      .from(userRoles)
      .all();

    const rolesMap = rolesByUser.reduce(
      (acc, { userId, roleId }) => {
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(roleId);
        return acc;
      },
      {} as Record<number, number[]>
    );

    return results.map((result) => ({
      id: result.id,
      name: result.name,
      banned: result.banned,
      bannerColor: result.bannerColor,
      bio: result.bio,
      avatarId: result.avatarId,
      bannerId: result.bannerId,
      avatar: result.avatar,
      banner: result.banner,
      createdAt: result.createdAt,
      roleIds: rolesMap[result.id] || []
    }));
  }
};

export { getPublicUsers };
