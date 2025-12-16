import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import { UserStatus } from '@sharkord/shared';

const STATUS_ORDER: Record<string, number> = {
  online: 0,
  idle: 1,
  offline: 2
};

export const usersSelector = createSelector(
  (state: IRootState) => state.server.users,
  (users) => {
    return [...users].sort((a, b) => {
      const aBanned = Boolean(a.banned);
      const bBanned = Boolean(b.banned);

      if (aBanned !== bBanned) {
        return aBanned ? 1 : -1;
      }

      const aStatus = STATUS_ORDER[String(a.status ?? UserStatus.OFFLINE)] ?? 3;
      const bStatus = STATUS_ORDER[String(b.status ?? UserStatus.OFFLINE)] ?? 3;

      if (aStatus !== bStatus) {
        return aStatus - bStatus;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }
);

export const ownUserIdSelector = (state: IRootState) => state.server.ownUserId;

export const ownUserSelector = createSelector(
  [ownUserIdSelector, usersSelector],
  (ownUserId, users) => users.find((user) => user.id === ownUserId)
);

export const userByIdSelector = createSelector(
  [usersSelector, (_, userId: number) => userId],
  (users, userId) => users.find((user) => user.id === userId)
);

export const isOwnUserSelector = createSelector(
  [ownUserIdSelector, (_, userId: number) => userId],
  (ownUserId, userId) => ownUserId === userId
);

export const ownPublicUserSelector = createSelector(
  [ownUserIdSelector, usersSelector],
  (ownUserId, users) => users.find((user) => user.id === ownUserId)
);

export const userStatusSelector = createSelector(
  [userByIdSelector],
  (user) => user?.status ?? UserStatus.OFFLINE
);
