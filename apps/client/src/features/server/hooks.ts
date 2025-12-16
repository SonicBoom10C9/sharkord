import { OWNER_ROLE_ID, Permission } from '@sharkord/shared';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { IRootState } from '../store';
import {
  connectedSelector,
  connectingSelector,
  disconnectInfoSelector,
  infoSelector,
  ownUserRolesSelector,
  ownVoiceUserSelector,
  publicServerSettingsSelector,
  serverNameSelector,
  typingUsersByChannelIdSelector,
  userRolesSelector,
  voiceUsersByChannelIdSelector
} from './selectors';

export const useIsConnected = () => useSelector(connectedSelector);

export const useIsConnecting = () => useSelector(connectingSelector);

export const useDisconnectInfo = () => useSelector(disconnectInfoSelector);

export const useServerName = () => useSelector(serverNameSelector);

export const usePublicServerSettings = () =>
  useSelector(publicServerSettingsSelector);

export const useOwnUserRoles = () => useSelector(ownUserRolesSelector);

export const useInfo = () => useSelector(infoSelector);

export const useCan = () => {
  const ownUserRoles = useOwnUserRoles();

  const can = useCallback(
    (permission: Permission | Permission[]) => {
      const hasOwnerRole = ownUserRoles.find(
        (role) => role.id === OWNER_ROLE_ID
      );

      if (hasOwnerRole) return true;

      const permissionsToCheck = Array.isArray(permission)
        ? permission
        : [permission];

      for (const role of ownUserRoles) {
        for (const perm of role.permissions) {
          if (permissionsToCheck.includes(perm)) {
            return true;
          }
        }
      }

      return false;
    },
    [ownUserRoles]
  );

  return can;
};

export const useUserRoles = (userId: number) =>
  useSelector((state: IRootState) => userRolesSelector(state, userId));

export const useTypingUsersByChannelId = (channelId: number) =>
  useSelector((state: IRootState) =>
    typingUsersByChannelIdSelector(state, channelId)
  );

export const useVoiceUsersByChannelId = (channelId: number) =>
  useSelector((state: IRootState) =>
    voiceUsersByChannelIdSelector(state, channelId)
  );

export const useOwnVoiceUser = () => useSelector(ownVoiceUserSelector);
