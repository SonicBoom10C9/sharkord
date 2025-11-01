import { Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { updateUser } from '../../db/mutations/users/update-user';
import { publishUser } from '../../db/publishers';
import { protectedProcedure } from '../../utils/trpc';

const changeRoleRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      roleId: z.number()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    const updatedUser = await updateUser(input.userId, {
      roleId: input.roleId
    });

    if (!updatedUser) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR'
      });
    }

    await publishUser(updatedUser.id, 'update');
  });

export { changeRoleRoute };
