import { Alert, Button, Loader, Modal, Stack, Text } from '@mantine/core'
import { IconAlertTriangle, IconDeviceDesktopDown } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { ActivityBadge, StateBadge } from '../common/Badges'
import { DataTable, type DataTableColumn } from '../common/DataTable'
import { DetailGrid } from '../common/DetailGrid'
import { useAppDownload } from '../../hooks/useAppDownload'
import { useFleet, type FleetRow } from '../../hooks/useFleet'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { PAGE_SIZE } from '../../lib/config'
import { exportTable } from '../../lib/export'
import { formatDateTime, formatNumber, formatSpeed, text } from '../../lib/format'
import { notify } from '../../utils/notify'

type Activity = 'active' | 'inactive' | 'unknown'

const ACTIVITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'unknown', label: 'Not fetched' },
]

/** A vehicle with no status record, or a record without an active flag, counts as unknown. */
function activityOf(row: FleetRow): Activity {
  const flag = row.status?.isActive
  return flag === true ? 'active' : flag === false ? 'inactive' : 'unknown'
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
  'Status date/time',
  'Main power',
  'Ignition',
  'Speed (km/h)',
  'Alerts',
]

const ACTIVITY_LABEL: Record<Activity, string> = { active: 'Active', inactive: 'Inactive', unknown: 'Not fetched' }

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
    cell(s?.statusDateTime),
    cell(s?.mainPower),
    cell(s?.ignition),
    cell(s?.speed),
    cell(s?.alerts),
  ]
}

export function FleetTable() {
  const filters = useUrlFilters(['activity'])
  const fleet = useFleet()
  const appDownload = useAppDownload()
  const [selected, setSelected] = useState<FleetRow | null>(null)
  const [exporting, setExporting] = useState(false)
  const [shown, setShown] = useState({ key: '', count: PAGE_SIZE })

  const rawActivity = filters.extras.activity ?? ''
  const activity = ACTIVITY_OPTIONS.some((o) => o.value === rawActivity) ? rawActivity : ''
  const query = filters.search.toLowerCase()

  const filtered = useMemo(
    () => fleet.rows.filter((row) => (!activity || activityOf(row) === activity) && (!query || matches(row, query))),
    [fleet.rows, activity, query],
  )

  // Show a page at a time; the window resets whenever the filters change.
  const windowKey = `${query}|${activity}`
  const count = shown.key === windowKey ? shown.count : PAGE_SIZE
  const visible = filtered.slice(0, count)

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
    {
      key: 'activity',
      header: 'Status',
      render: (row) =>
        row.status ? (
          <ActivityBadge active={row.status.isActive} />
        ) : fleet.statusesLoading ? (
          <Loader size={14} />
        ) : (
          <Text size="sm" c="dimmed">
            Not fetched
          </Text>
        ),
    },
    { key: 'imei', header: 'IMEI', render: ({ vehicle }) => <Text size="sm" ff="monospace">{text(vehicle.imei)}</Text> },
    { key: 'owner', header: 'Owner', render: ({ vehicle }) => text(vehicle.owner) },
    { key: 'rto', header: 'RTO', render: ({ vehicle }) => text(vehicle.rto), hideOnMobile: true },
    { key: 'statusTime', header: 'Status time', render: ({ status }) => formatDateTime(status?.statusDateTime) },
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
          fields: [{ key: 'activity', label: 'Status', type: 'segmented', data: ACTIVITY_OPTIONS }],
          values: { activity },
          onChange: (key, value) => filters.setParam(key, value || null),
          onReset: filters.reset,
          activeCount: activity ? 1 : 0,
        }}
        primaryAction={{
          label: 'Download app',
          icon: <IconDeviceDesktopDown size={16} />,
          onClick: () => void appDownload.start(),
          // Progress is shown in the notification, so the button just locks meanwhile.
          disabled: appDownload.downloading,
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
          ['Status', s ? <ActivityBadge key="a" active={s.isActive} /> : 'Not fetched yet'],
          ['Status date/time', formatDateTime(s?.statusDateTime)],
          ['Speed', formatSpeed(s?.speed)],
          ['Main power', <StateBadge key="p" value={s?.mainPower ?? null} />],
          ['Ignition', <StateBadge key="i" value={s?.ignition ?? null} neutralOff />],
          ['Fetched', formatDateTime(s ? (s.updatedAt ?? s.createdAt) : null)],
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
