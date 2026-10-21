import React, { type ReactNode } from 'react'
import * as Application from 'expo-application'
import { useQuery } from 'convex/react'
import { api } from '@pa/backend/api'
import { MinimumVersionScreen } from './minimum-version-screen'
import {
  getMobilePlatform,
  parseNativeBuild,
  shouldRequireMinimumVersion,
} from './version-policy'

export function MinimumVersionGate({ children }: { children: ReactNode }) {
  const platform = getMobilePlatform()
  const policy = useQuery(
    api.functions.appVersions.getMinimumVersion,
    !__DEV__ && platform ? { platform } : 'skip',
  )
  const currentBuild = parseNativeBuild(Application.nativeBuildVersion)
  const updateRequired = shouldRequireMinimumVersion({
    policy,
    currentBuild,
  })

  // Loading, offline, unsupported platforms, and malformed native metadata all
  // fail open.
  if (!updateRequired || !policy || currentBuild === null) return children

  return (
    <MinimumVersionScreen
      currentVersion={Application.nativeApplicationVersion ?? 'unknown'}
      currentBuild={currentBuild}
      policy={policy}
    />
  )
}
