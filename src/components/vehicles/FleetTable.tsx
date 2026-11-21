import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { IconAlertTriangle, IconListCheck, IconSend } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { ActivityBadge, StateBadge } from '../common/Badges'
import { DataTable, type DataTableColumn } from '../common/DataTable'
import { DetailGrid } from '../common/DetailGrid'
import { fetchEveryRow, useFleet, type FleetFilters, type FleetRow } from '../../hooks/useFleet'
import { useUrlFilters } from '../../hooks/useUrlFilters'
import { exportTable } from '../../lib/export'
import { formatDateTime, formatNumber, formatSpeed, text } from '../../lib/format'
import { queueImeis } from '../../services/vehicles'
import { notify } from '../../utils/notify'

const FLAG_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const SORT_BY_OPTIONS = [
  { value: 'sm', label: 'Suraksha Mitr' },
  { value: 'apm', label: 'APM device' },
  { value: 'fetched', label: 'Fetched at' },
]

const ORDER_OPTIONS = [
  { value: 'desc', label: 'Newest' },
  { value: 'asc', label: 'Oldest' },
]

/** Milliseconds for a recorded time, or null when missing (including the API's 0001-01-01 placeholder). */
function timeOf(value: string | null | undefined) {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) || new Date(time).getFullYear() < 1970 ? null : time
}

/** Orders loaded rows by APM device time or fetched time (the API can't); rows without a time go last. */
function sortRows(rows: FleetRow[], field: string, direction: string) {
  const read = (row: FleetRow) => timeOf(field === 'apm' ? row.status?.apmDeviceTime : row.status?.updatedAt)
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = read(a)
    const y = read(b)
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
    return (x - y) * sign
  })
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
  'Suraksha Mitr',
  'APM Connect',
  'Suraksha Mitr date/time',
  'APM device time',
  'Fetched at',
  'Main power',
  'Ignition',
  'Speed (km/h)',
  'Alerts',
]

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
    flagLabel(s?.isSurakshaMitrActive),
    flagLabel(s?.isApmConnectActive),
    cell(s?.surakshaMitrDateTime),
    cell(s?.apmDeviceTime),
    cell(s?.updatedAt),
    cell(s?.mainPower),
    cell(s?.ignition),
    cell(s?.speed),
    cell(s?.alerts),
  ]
}

export function FleetTable() {
  const filters = useUrlFilters(['surakshaMitr', 'apmConnect', 'sortBy', 'order'])
  const [selected, setSelected] = useState<FleetRow | null>(null)
  const [exporting, setExporting] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<ReadonlySet<string | number>>(new Set())
  const [queuing, setQueuing] = useState(false)

  const flagParam = (key: 'surakshaMitr' | 'apmConnect') => {
    const raw = filters.extras[key] ?? ''
    return FLAG_OPTIONS.some((o) => o.value === raw) ? raw : ''
  }
  const surakshaMitr = flagParam('surakshaMitr')
  const apmConnect = flagParam('apmConnect')
  // Newest Suraksha Mitr time first unless the URL says otherwise.
  const sortBy = filters.extras.sortBy === 'apm' || filters.extras.sortBy === 'fetched' ? filters.extras.sortBy : 'sm'
  const order = filters.extras.order === 'asc' ? 'asc' : 'desc'

  // Filtering, searching and ordering all happen on the API.
  const fleetFilters: FleetFilters = {
    search: filters.search,
    surakshaMitrActive: surakshaMitr ? surakshaMitr === 'active' : undefined,
    apmConnectActive: apmConnect ? apmConnect === 'active' : undefined,
    // Only the Suraksha Mitr time is ordered by the API; the other two order the loaded rows below.
    order: sortBy === 'sm' ? order : 'desc',
  }
  const fleet = useFleet(fleetFilters)
  const visible = useMemo(
    () => (sortBy === 'sm' ? fleet.rows : sortRows(fleet.rows, sortBy, order)),
    [fleet.rows, sortBy, order],
  )

  // Only rows currently loaded can be sent, so ignore picks that a filter change has hidden.
  const chosen = useMemo(() => visible.filter(({ vehicle }) => picked.has(vehicle.id)), [visible, picked])

  const startSelecting = () => {
    // Re-fetching is for vehicles that went quiet, so start from the Suraksha Mitr inactive list.
    filters.setParam('surakshaMitr', 'inactive')
    setPicked(new Set())
    setSelecting(true)
  }
  const stopSelecting = () => {
    setSelecting(false)
    setPicked(new Set())
  }

  const toggleRow = ({ vehicle }: FleetRow) =>
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(vehicle.id)) next.delete(vehicle.id)
      else next.add(vehicle.id)
      return next
    })

  const onQueue = async () => {
    const imeis = [...new Set(chosen.map(({ vehicle }) => (vehicle.imei ?? '').trim()).filter(Boolean))]
    if (imeis.length === 0) return
    setQueuing(true)
    try {
      const result = await queueImeis(imeis)
      const already = result?.alreadyInQueue ? ` ${formatNumber(result.alreadyInQueue)} were already queued.` : ''
      notify.success(`${formatNumber(imeis.length)} IMEI${imeis.length === 1 ? '' : 's'} sent for a fresh fetch.${already}`, 'Queued')
      stopSelecting()
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'The IMEIs could not be sent. Please try again.', 'Queue failed')
    } finally {
      setQueuing(false)
    }
  }

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
      render: ({ status }) => <ActivityBadge active={status?.isSurakshaMitrActive ?? null} />,
    },
    { key: 'surakshaMitrTime', header: 'Suraksha Mitr time', render: ({ status }) => formatDateTime(status?.surakshaMitrDateTime) },
    {
      key: 'apmConnect',
      header: 'APM Connect',
      render: ({ status }) => <ActivityBadge active={status?.isApmConnectActive ?? null} />,
    },
    { key: 'apmDeviceTime', header: 'APM device time', render: ({ status }) => formatDateTime(status?.apmDeviceTime) },
    { key: 'fetchedAt', header: 'Fetched at', render: ({ status }) => formatDateTime(status?.updatedAt) },
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
      // Every record matching the current filters, not only the ones loaded on screen.
      const everyRow = await fetchEveryRow(fleetFilters)
      const rows = sortBy === 'sm' ? everyRow : sortRows(everyRow, sortBy, order)
      await exportTable('xlsx', 'vehicles', EXPORT_HEADERS, rows.map(toExportRow))
      notify.success(`${formatNumber(rows.length)} vehicle${rows.length === 1 ? '' : 's'} exported.`, 'Export ready')
    } catch {
      notify.error('The file could not be created. Please try again.', 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const exportBlocked = fleet.error && visible.length === 0 ? 'Export is unavailable because vehicles failed to load' : visible.length === 0 ? 'Nothing to export' : undefined

  const selectBar = selecting ? (
    <Group justify="space-between" gap="sm" px={{ base: 'md', sm: 'lg' }} py="xs" style={{ borderBottom: '1px solid var(--app-border)' }}>
      <Text size="sm" fw={600}>
        {formatNumber(chosen.length)} selected
        <Text span size="sm" c="dimmed" fw={400}>
          {' '}· Suraksha Mitr inactive vehicles
        </Text>
      </Text>
      <Group gap="xs">
        <Button variant="default" size="xs" onClick={stopSelecting} disabled={queuing}>
          Cancel
        </Button>
        <Button size="xs" leftSection={<IconSend size={14} />} onClick={onQueue} loading={queuing} disabled={chosen.length === 0}>
          Send {chosen.length > 0 ? formatNumber(chosen.length) : ''} IMEI{chosen.length === 1 ? '' : 's'}
        </Button>
      </Group>
    </Group>
  ) : (
    <Group justify="flex-end" px={{ base: 'md', sm: 'lg' }} py={6} style={{ borderBottom: '1px solid var(--app-border)' }}>
      <Button variant="subtle" size="compact-sm" leftSection={<IconListCheck size={16} />} onClick={startSelecting}>
        Select vehicles
      </Button>
    </Group>
  )

  const warnings: string[] = []

  const summary = `Showing ${formatNumber(visible.length)} of ${formatNumber(fleet.total ?? visible.length)} vehicle${fleet.total === 1 ? '' : 's'}`

  const isFiltered = filters.isFiltered || filters.input !== ''

  return (
    <>
      <DataTable
        title="Vehicles"
        count={fleet.total}
        noun="vehicle"
        data={visible}
        columns={columns}
        rowKey={({ vehicle }) => vehicle.id}
        loading={fleet.isLoading}
        error={fleet.rows.length === 0 ? fleet.error : null}
        errorTitle="Couldn't load vehicles"
        search={{ value: filters.input, onChange: filters.setInput, placeholder: 'Search vehicle no, IMEI, owner…' }}
        filters={{
          fields: [
            { key: 'surakshaMitr', label: 'Suraksha Mitr', type: 'segmented', data: FLAG_OPTIONS, disabled: selecting },
            { key: 'apmConnect', label: 'APM Connect', type: 'segmented', data: FLAG_OPTIONS },
            { key: 'sortBy', label: 'Sort by time', type: 'segmented', data: SORT_BY_OPTIONS, disabled: selecting },
            { key: 'order', label: 'Order', type: 'segmented', data: ORDER_OPTIONS },
          ],
          values: { surakshaMitr, apmConnect, sortBy, order },
          onChange: (key, value) => filters.setParam(key, (key === 'order' && value === 'desc') || (key === 'sortBy' && value === 'sm') ? null : value || null),
          onReset: filters.reset,
          activeCount: (surakshaMitr ? 1 : 0) + (apmConnect ? 1 : 0) + (sortBy !== 'sm' || order !== 'desc' ? 1 : 0),
        }}
        exporter={{ onExport, busy: exporting, disabledReason: exportBlocked }}
        onRefresh={fleet.reload}
        hasMore={fleet.hasMore}
        loadingMore={fleet.loadingMore}
        loadMoreError={visible.length > 0 ? fleet.error : null}
        onLoadMore={fleet.loadMore}
        summary={summary}
        banner={
          <>
            {selectBar}
            {warnings.length > 0 && (
              <Alert color="yellow" variant="light" radius={0} icon={<IconAlertTriangle size={18} />}>
                <Stack gap={2}>
                  {warnings.map((warning) => (
                    <Text key={String(warning)} size="sm">
                      {warning}
                    </Text>
                  ))}
                </Stack>
              </Alert>
            )}
          </>
        }
        selection={selecting ? { selected: picked, onChange: setPicked } : undefined}
        onRowClick={selecting ? toggleRow : setSelected}
        empty={
          isFiltered
            ? {
                title: 'No vehicles match your filters',
                description: 'Try a different search or reset the filters.',
                action: (
                  <Button variant="light" size="xs" onClick={filters.reset}>
                    Reset filters
                  </Button>
                ),
              }
            : {
                title: 'No vehicles yet',
                description: 'Vehicles appear here once the Automation app has fetched their status.',
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
