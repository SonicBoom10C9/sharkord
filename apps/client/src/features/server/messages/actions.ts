import { store } from '@/features/store';
import { TYPING_MS, type TJoinedMessage } from '@sharkord/shared';
import { serverSliceActions } from '../slice';

const typingTimeouts: { [key: string]: NodeJS.Timeout } = {};

export const addMessages = (
  channelId: number,
  messages: TJoinedMessage[],
  opts: { prepend?: boolean } = {}
) => {
  store.dispatch(serverSliceActions.addMessages({ channelId, messages, opts }));
};

export const updateMessage = (channelId: number, message: TJoinedMessage) => {
  store.dispatch(serverSliceActions.updateMessage({ channelId, message }));
};

export const deleteMessage = (channelId: number, messageId: number) => {
  store.dispatch(serverSliceActions.deleteMessage({ channelId, messageId }));
};

export const addTypingUser = (channelId: number, userId: number) => {
  store.dispatch(serverSliceActions.addTypingUser({ channelId, userId }));

  const timeoutKey = `${channelId}-${userId}`;

  if (typingTimeouts[timeoutKey]) {
    clearTimeout(typingTimeouts[timeoutKey]);
  }

  typingTimeouts[timeoutKey] = setTimeout(() => {
    removeTypingUser(channelId, userId);
    delete typingTimeouts[timeoutKey];
  }, TYPING_MS + 500);
};

export const removeTypingUser = (channelId: number, userId: number) => {
  store.dispatch(serverSliceActions.removeTypingUser({ channelId, userId }));
};
