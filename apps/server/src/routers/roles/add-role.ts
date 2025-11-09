import { ActivityLogType, Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { createRole } from '../../db/mutations/roles/create-role';
import { publishRole } from '../../db/publishers';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const addRoleRoute = protectedProcedure.mutation(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_ROLES);

  const role = await createRole({
    name: 'New Role',
    color: '#ffffff',
    isDefault: false,
    isPersistent: false
  });

  if (!role) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR'
    });
  }

  publishRole(role.id, 'create');
  enqueueActivityLog({
    type: ActivityLogType.CREATED_ROLE,
    userId: ctx.user.id,
    details: {
      roleId: role.id,
      roleName: role.name
    }
  });

  return role.id;
});

export { addRoleRoute };
