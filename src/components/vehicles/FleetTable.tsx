import { Alert, Button, Loader, Modal, Stack, Text } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { ActivityBadge, StateBadge } from '../common/Badges'
import { DataTable, type DataTableColumn } from '../common/DataTable'
import { DetailGrid } from '../common/DetailGrid'
import { useFleet, type FleetRow } from '../../hooks/useFleet'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { activityOf as statusActivity, type Activity } from '../../lib/activity'
import { PAGE_SIZE } from '../../lib/config'
import { exportTable } from '../../lib/export'
import { formatDateTime, formatNumber, formatSpeed, text } from '../../lib/format'
import { notify } from '../../utils/notify'

const FLAG_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/** Whether a vehicle's status flag satisfies a filter; vehicles with no status never match one. */
function flagMatches(flag: boolean | null | undefined, filter: string) {
  if (!filter) return true
  return filter === 'active' ? flag === true : flag === false
}

/** Active if either product is active, inactive if both are; no record or missing flags is unknown. */
function activityOf(row: FleetRow): Activity {
  return statusActivity(row.status)
}

function matches(row: FleetRow, query: string) {
  const { vehicle: v } = row
  return [v.vehicleNo, v.imei, v.owner, v.rto, v.chassisNo].some((field) => field?.toLowerCase().includes(query))
}

const EXPORT_HEADERS = [
  'Vehicle no',
  'IMEI',
  'Chassis no',
  'Owner',
  'Owner mobile',
  'Owner address',
  'RTO',
  'State',
  'Vehicle class',
  'VLT model',
  'Manufacturer',
  'Franchisee',
  'Portal status',
  'Status',
  'Suraksha Mitr',
  'APM Connect',
  'Suraksha Mitr date/time',
  'APM device time',
  'Main power',
  'Ignition',
  'Speed (km/h)',
  'Alerts',
]

const ACTIVITY_LABEL: Record<Activity, string> = { active: 'Active', inactive: 'Inactive', unknown: 'Not fetched' }

const flagLabel = (flag: boolean | null | undefined) => (flag === true ? 'Active' : flag === false ? 'Inactive' : '')

function toExportRow({ vehicle: v, status: s }: FleetRow): string[] {
  const cell = (value: string | number | null | undefined) => (value === null || value === undefined ? '' : String(value))
  return [
    cell(v.vehicleNo),
    cell(v.imei),
    cell(v.chassisNo),
    cell(v.owner),
    cell(v.ownerMobile),
    cell(v.ownerAddress),
    cell(v.rto),
    cell(v.state),
    cell(v.vehicleClass),
    cell(v.vltModel),
    cell(v.manufacturer),
    cell(v.franchisee),
    cell(v.status),
    ACTIVITY_LABEL[activityOf({ vehicle: v, status: s })],
    flagLabel(s?.isSurakshaMitrActive),
    flagLabel(s?.isApmConnectActive),
    cell(s?.surakshaMitrDateTime),
    cell(s?.apmDeviceTime),
    cell(s?.mainPower),
    cell(s?.ignition),
    cell(s?.speed),
    cell(s?.alerts),
  ]
}

export function FleetTable() {
  const filters = useUrlFilters(['surakshaMitr', 'apmConnect'])
  const fleet = useFleet()
  const [selected, setSelected] = useState<FleetRow | null>(null)
  const [exporting, setExporting] = useState(false)
  const [shown, setShown] = useState({ key: '', count: PAGE_SIZE })

  const flagParam = (key: 'surakshaMitr' | 'apmConnect') => {
    const raw = filters.extras[key] ?? ''
    return FLAG_OPTIONS.some((o) => o.value === raw) ? raw : ''
  }
  const surakshaMitr = flagParam('surakshaMitr')
  const apmConnect = flagParam('apmConnect')
  const query = filters.search.toLowerCase()

  const filtered = useMemo(
    () =>
      fleet.rows.filter(
        (row) =>
          flagMatches(row.status?.isSurakshaMitrActive, surakshaMitr) &&
          flagMatches(row.status?.isApmConnectActive, apmConnect) &&
          (!query || matches(row, query)),
      ),
    [fleet.rows, surakshaMitr, apmConnect, query],
  )

  // Show a page at a time; the window resets whenever the filters change.
  const windowKey = `${query}|${surakshaMitr}|${apmConnect}`
  const count = shown.key === windowKey ? shown.count : PAGE_SIZE
  const visible = filtered.slice(0, count)

  const notFetched = fleet.statusesLoading ? (
    <Loader size={14} />
  ) : (
    <Text size="sm" c="dimmed">
      Not fetched
    </Text>
  )

  const columns: DataTableColumn<FleetRow>[] = [
    {
      key: 'vehicleNo',
      header: 'Vehicle no',
      render: ({ vehicle }) => (
        <Text size="sm" fw={600}>
          {text(vehicle.vehicleNo)}
        </Text>
      ),
    },
    { key: 'imei', header: 'IMEI', render: ({ vehicle }) => <Text size="sm" ff="monospace">{text(vehicle.imei)}</Text> },
    {
      key: 'surakshaMitr',
      header: 'Suraksha Mitr',
      render: (row) => (row.status ? <ActivityBadge active={row.status.isSurakshaMitrActive} /> : notFetched),
    },
    { key: 'surakshaMitrTime', header: 'Suraksha Mitr time', render: ({ status }) => formatDateTime(status?.surakshaMitrDateTime) },
    {
      key: 'apmConnect',
      header: 'APM Connect',
      render: (row) => (row.status ? <ActivityBadge active={row.status.isApmConnectActive} /> : notFetched),
    },
    { key: 'apmDeviceTime', header: 'APM device time', render: ({ status }) => formatDateTime(status?.apmDeviceTime) },
    { key: 'owner', header: 'Owner', render: ({ vehicle }) => text(vehicle.owner) },
    { key: 'ownerMobile', header: 'Owner mobile', render: ({ vehicle }) => text(vehicle.ownerMobile) },
    { key: 'rto', header: 'RTO', render: ({ vehicle }) => text(vehicle.rto), hideOnMobile: true },
    { key: 'mainPower', header: 'Main power', render: ({ status }) => <StateBadge value={status?.mainPower ?? null} />, hideOnMobile: true },
    { key: 'ignition', header: 'Ignition', render: ({ status }) => <StateBadge value={status?.ignition ?? null} neutralOff />, hideOnMobile: true },
    { key: 'speed', header: 'Speed', render: ({ status }) => formatSpeed(status?.speed), hideOnMobile: true },
    {
      key: 'alerts',
      header: 'Alerts',
      render: ({ status }) => (
        <Text size="sm" maw={260} truncate title={status?.alerts ?? undefined}>
          {text(status?.alerts)}
        </Text>
      ),
      hideOnMobile: true,
    },
  ]

  const onExport = async () => {
    setExporting(true)
    try {
      await exportTable('xlsx', 'vehicles', EXPORT_HEADERS, filtered.map(toExportRow))
      notify.success(`${formatNumber(filtered.length)} vehicle${filtered.length === 1 ? '' : 's'} exported.`, 'Export ready')
    } catch {
      notify.error('The file could not be created. Please try again.', 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const exportBlocked = fleet.vehiclesError
    ? 'Export is unavailable because vehicles failed to load'
    : !fleet.isComplete
      ? 'Export is available once everything has finished loading'
      : filtered.length === 0
        ? 'Nothing to export'
        : undefined

  const warnings = [
    fleet.vehiclesError && fleet.rows.length > 0 && `Only some vehicles could be loaded (${fleet.vehiclesError.message}).`,
    fleet.statusError && `Status details could not be loaded (${fleet.statusError.message}). Status may be missing.`,
  ].filter(Boolean)

  const total = fleet.rows.length
  const summary = `Showing ${formatNumber(visible.length)} of ${formatNumber(filtered.length)} vehicle${filtered.length === 1 ? '' : 's'}${
    filtered.length !== total ? ` (${formatNumber(total)} total)` : ''
  }${fleet.isComplete ? '' : ' · still loading…'}`

  const isFiltered = filters.isFiltered || filters.input !== ''

  return (
    <>
      <DataTable
        title="Vehicles"
        noun="vehicle"
        data={visible}
        columns={columns}
        rowKey={({ vehicle }) => vehicle.id}
        loading={fleet.isLoading}
        error={fleet.rows.length === 0 ? fleet.vehiclesError : null}
        errorTitle="Couldn't load vehicles"
        search={{ value: filters.input, onChange: filters.setInput, placeholder: 'Search vehicle no, IMEI, owner…' }}
        filters={{
          fields: [
            { key: 'surakshaMitr', label: 'Suraksha Mitr', type: 'segmented', data: FLAG_OPTIONS },
            { key: 'apmConnect', label: 'APM Connect', type: 'segmented', data: FLAG_OPTIONS },
          ],
          values: { surakshaMitr, apmConnect },
          onChange: (key, value) => filters.setParam(key, value || null),
          onReset: filters.reset,
          activeCount: (surakshaMitr ? 1 : 0) + (apmConnect ? 1 : 0),
        }}
        exporter={{ onExport, busy: exporting, disabledReason: exportBlocked }}
        onRefresh={fleet.reload}
        hasMore={visible.length < filtered.length}
        loadingMore={false}
        loadMoreError={null}
        onLoadMore={() => setShown({ key: windowKey, count: count + PAGE_SIZE })}
        summary={summary}
        banner={
          warnings.length > 0 ? (
            <Alert color="yellow" variant="light" radius={0} icon={<IconAlertTriangle size={18} />}>
              <Stack gap={2}>
                {warnings.map((warning) => (
                  <Text key={String(warning)} size="sm">
                    {warning}
                  </Text>
                ))}
              </Stack>
            </Alert>
          ) : undefined
        }
        onRowClick={setSelected}
        empty={
          isFiltered
            ? {
                title: 'No vehicles match your filters',
                description: fleet.isComplete
                  ? 'Try a different search or reset the filters.'
                  : 'Still loading — more vehicles may appear in a moment.',
                action: (
                  <Button variant="light" size="xs" onClick={filters.reset}>
                    Reset filters
                  </Button>
                ),
              }
            : {
                title: 'No vehicles yet',
                description: 'Vehicles appear here once the Automation app has synced them.',
              }
        }
      />

      <Modal
        opened={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.vehicle.vehicleNo ?? 'Vehicle details'}
        size="lg"
        styles={{ title: { fontWeight: 650 } }}
      >
        {selected && <VehicleDetails row={selected} />}
      </Modal>
    </>
  )
}

function VehicleDetails({ row: { vehicle: v, status: s } }: { row: FleetRow }) {
  return (
    <Stack gap="lg">
      <DetailGrid
        items={[
          ['Vehicle number', text(v.vehicleNo)],
          ['IMEI', text(v.imei)],
          ['Suraksha Mitr', s ? <ActivityBadge key="sm" active={s.isSurakshaMitrActive} /> : 'Not fetched yet'],
          ['APM Connect', s ? <ActivityBadge key="ac" active={s.isApmConnectActive} /> : 'Not fetched yet'],
          ['Suraksha Mitr date/time', formatDateTime(s?.surakshaMitrDateTime)],
          ['APM device time', formatDateTime(s?.apmDeviceTime)],
          ['Speed', formatSpeed(s?.speed)],
          ['Main power', <StateBadge key="p" value={s?.mainPower ?? null} />],
          ['Ignition', <StateBadge key="i" value={s?.ignition ?? null} neutralOff />],
          ['Fetched', formatDateTime(s?.updatedAt)],
          ['Chassis number', text(v.chassisNo)],
          ['Portal status', <StateBadge key="ps" value={v.status} />],
          ['Owner', text(v.owner)],
          ['Owner mobile', text(v.ownerMobile)],
          ['Owner address', text(v.ownerAddress)],
          ['RTO', text(v.rto)],
          ['State', text(v.state)],
          ['Vehicle class', text(v.vehicleClass)],
          ['VLT model', text(v.vltModel)],
          ['Manufacturer', text(v.manufacturer)],
          ['Franchisee', text(v.franchisee)],
          ['Updated', formatDateTime(v.updatedAt ?? v.createdAt)],
        ]}
      />
      <div>
        <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.3} mb={2}>
          Alerts
        </Text>
        <Text size="sm" className="whitespace-pre-wrap wrap-break-word">
          {text(s?.alerts)}
        </Text>
      </div>
    </Stack>
  )
}
