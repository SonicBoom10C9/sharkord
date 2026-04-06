import { ActivityLogType, OWNER_ROLE_ID, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { getUserRoleIds } from '../../db/queries/roles';
import { users } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const resetPasswordRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      newPassword: z.string().min(4).max(128)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    invariant(input.userId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'Use the change password flow for your own account.'
    });

    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .get();

    invariant(user, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    const targetRoles = await getUserRoleIds(input.userId);
    invariant(!targetRoles.includes(OWNER_ROLE_ID), {
      code: 'FORBIDDEN',
      message: 'Cannot reset the password of an owner.'
    });

    const hashedPassword = await Bun.password.hash(input.newPassword);

    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, input.userId));

    enqueueActivityLog({
      type: ActivityLogType.USER_PASSWORD_RESET,
      userId: input.userId,
      details: {
        resetBy: ctx.userId
      }
    });
  });

export { resetPasswordRoute };
