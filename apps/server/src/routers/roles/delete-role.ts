import { ActivityLogType, Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { removeRole } from '../../db/mutations/roles/remove-role';
import { fallbackUsersToDefaultRole } from '../../db/mutations/users/fallback-users-to-default-role';
import { publishRole } from '../../db/publishers';
import { getRole } from '../../db/queries/roles/get-role';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const deleteRoleRoute = protectedProcedure
  .input(
    z.object({
      roleId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_ROLES);

    const role = await getRole(input.roleId);

    if (!role) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Role not found' });
    }

    if (role.isPersistent) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot delete a persistent role'
      });
    }

    if (role.isDefault) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot delete the default role'
      });
    }

    await fallbackUsersToDefaultRole(role.id);
    await removeRole(role.id);

    publishRole(role.id, 'delete');
    enqueueActivityLog({
      type: ActivityLogType.DELETED_ROLE,
      userId: ctx.user.id,
      details: {
        roleId: role.id,
        roleName: role.name
      }
    });
  });

export { deleteRoleRoute };
