import * as Network from 'expo-network';

/**
 * On Wi-Fi, or when the network cannot be read: big downloads start without
 * asking. Offline counts too: the download itself reports the missing connection.
 */
export async function onUnmeteredNetwork(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return (
      state.type === Network.NetworkStateType.WIFI ||
      state.type === Network.NetworkStateType.ETHERNET ||
      state.isConnected === false
    );
  } catch {
    return true;
  }
}
