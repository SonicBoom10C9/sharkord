import { ActivityLogType } from '@sharkord/shared';
import {
  generateRecoveryCodes,
  getRemainingCodeCount
} from '../../helpers/recovery-codes';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const getRecoveryCodeCountRoute = protectedProcedure.query(async ({ ctx }) => {
  const count = await getRemainingCodeCount(ctx.userId);
  return { remaining: count };
});

const regenerateRecoveryCodesRoute = protectedProcedure.mutation(
  async ({ ctx }) => {
    const codes = await generateRecoveryCodes(ctx.userId);

    enqueueActivityLog({
      type: ActivityLogType.USER_REGENERATED_RECOVERY_CODES,
      userId: ctx.userId
    });

    return { codes };
  }
);

export { getRecoveryCodeCountRoute, regenerateRecoveryCodesRoute };
