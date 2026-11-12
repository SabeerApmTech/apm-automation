import { useCallback, useMemo } from 'react'
import { getVehicles, getVehicleStatuses } from '../services/vehicles'
import type { Vehicle, VehicleStatusView } from '../types/api'
import { FETCH_SIZE, useAllPages } from './useAllPages'

export interface FleetRow {
  vehicle: Vehicle
  /** Null when no status has been fetched for this vehicle yet. */
  status: VehicleStatusView | null
}

/**
 * Vehicles joined with their latest status. Both lists load in parallel, page by page, so
 * the first rows appear immediately while the rest streams in.
 */
export function useFleet() {
  const vehicles = useAllPages<Vehicle>('vehicles', (afterId, signal) =>
    getVehicles({ afterId, take: FETCH_SIZE }, signal),
  )
  const statuses = useAllPages<VehicleStatusView>('statuses', (afterId, signal) =>
    getVehicleStatuses({ afterId, take: FETCH_SIZE }, signal),
  )

  const rows = useMemo<FleetRow[]>(() => {
    // One row per vehicle; if a vehicle ever has several status records keep the newest.
    const latest = new Map<number, VehicleStatusView>()
    for (const status of statuses.items) {
      const known = latest.get(status.vehicleListId)
      if (!known || status.id > known.id) latest.set(status.vehicleListId, status)
    }
    return vehicles.items.map((vehicle) => ({ vehicle, status: latest.get(vehicle.id) ?? null }))
  }, [vehicles.items, statuses.items])

  const reloadVehicles = vehicles.reload
  const reloadStatuses = statuses.reload
  const reload = useCallback(() => {
    reloadVehicles()
    reloadStatuses()
  }, [reloadVehicles, reloadStatuses])

  return {
    rows,
    /** True until the first page of vehicles (or an error) has arrived. */
    isLoading: !vehicles.done && vehicles.items.length === 0,
    statusesLoading: !statuses.done,
    /** Everything is loaded, so filters and exports cover the full fleet. */
    isComplete: vehicles.done && statuses.done,
    vehiclesError: vehicles.error,
    statusError: statuses.error,
    reload,
  }
}
