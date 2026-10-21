import { useState, useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'

/**
 * Hook that returns whether the device is currently connected to the internet.
 * Returns `null` while the initial check is pending.
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false)
    })
    return unsubscribe
  }, [])

  return isConnected
}
