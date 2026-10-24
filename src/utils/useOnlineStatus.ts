import { useNetworkStatus } from './useNetworkStatus';

/**
 * Returns a boolean representing internet connectivity, actively polled.
 */
export function useOnlineStatus(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}
