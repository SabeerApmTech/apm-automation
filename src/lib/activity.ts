import type { VehicleStatusView } from '../types/api'

export type Activity = 'active' | 'inactive' | 'unknown'

type Flags = Pick<VehicleStatusView, 'isSurakshaMitrActive' | 'isApmConnectActive'> | null | undefined

/**
 * Overall state of a vehicle: active when either product (Suraksha Mitr / APM Connect) is
 * active, inactive when both report inactive, otherwise unknown (no record or flags missing).
 */
export function activityOf(status: Flags): Activity {
  if (!status) return 'unknown'
  if (status.isSurakshaMitrActive === true || status.isApmConnectActive === true) return 'active'
  if (status.isSurakshaMitrActive === false && status.isApmConnectActive === false) return 'inactive'
  return 'unknown'
}
