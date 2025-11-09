import { ActivityLogType, Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { updateRole } from '../../db/mutations/roles/update-role';
import { publishRole } from '../../db/publishers';
import { getDefaultRole } from '../../db/queries/roles/get-default-role';
import { getRole } from '../../db/queries/roles/get-role';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const setDefaultRoleRoute = protectedProcedure
  .input(
    z.object({
      roleId: z.number().min(1)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_ROLES);

    const defaultRole = await getDefaultRole();

    if (!defaultRole) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Default role not found'
      });
    }

    if (input.roleId === defaultRole?.id) return;

    const newDefaultRole = await getRole(input.roleId);

    if (!newDefaultRole) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Role not found'
      });
    }

    await Promise.all([
      updateRole(defaultRole.id, { isDefault: false }),
      updateRole(input.roleId, { isDefault: true })
    ]);

    await Promise.all([
      publishRole(defaultRole.id, 'update'),
      publishRole(input.roleId, 'update')
    ]);

    enqueueActivityLog({
      type: ActivityLogType.UPDATED_DEFAULT_ROLE,
      userId: ctx.user.id,
      details: {
        newRoleId: input.roleId,
        oldRoleId: defaultRole.id,
        newRoleName: newDefaultRole.name,
        oldRoleName: defaultRole.name
      }
    });
  });

export { setDefaultRoleRoute };
