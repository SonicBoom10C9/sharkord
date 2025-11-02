import { Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { updateRole } from '../../db/mutations/roles/update-role';
import { publishRole } from '../../db/publishers';
import { getDefaultRole } from '../../db/queries/roles/get-default-role';
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

    await Promise.all([
      updateRole(defaultRole.id, { isDefault: false }),
      updateRole(input.roleId, { isDefault: true })
    ]);

    await Promise.all([
      publishRole(defaultRole.id, 'update'),
      publishRole(input.roleId, 'update')
    ]);
  });

export { setDefaultRoleRoute };
