import { type TUser } from '@sharkord/shared';
import { db } from '../..';
import { getDefaultRole } from '../../queries/roles/get-default-role';
import { userRoles, users } from '../../schema';

const createUser = async (
  identity: string,
  password: string
): Promise<TUser> => {
  const defaultRole = await getDefaultRole();

  if (!defaultRole) {
    throw new Error('Default role not found');
  }

  const [user] = await db
    .insert(users)
    .values({
      name: 'SharkordUser',
      identity,
      createdAt: Date.now(),
      password
    })
    .returning();

  if (!user) {
    throw new Error('Failed to create user');
  }

  await db.insert(userRoles).values({
    roleId: defaultRole.id,
    userId: user.id,
    createdAt: Date.now()
  });

  return user;
};

export { createUser };
