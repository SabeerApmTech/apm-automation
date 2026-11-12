import { Anchor, Group, SimpleGrid, Skeleton, Stack, Table, Text, ThemeIcon, UnstyledButton, type MantineColor } from '@mantine/core'
import { IconChevronRight, IconDownload, IconPlugConnected, IconPlugConnectedX, IconRefresh, IconTruck } from '@tabler/icons-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ActivityBadge } from '../components/common/Badges'
import { QueryError } from '../components/common/QueryError'
import { SectionCard } from '../components/common/SectionCard'
import { StatCard } from '../components/common/StatCard'
import { fetchEveryPage, FETCH_SIZE } from '../hooks/useAllPages'
import { useCursorList } from '../hooks/useCursorList'
import { useStatusSummary } from '../hooks/useStatusSummary'
import { formatDateTime, formatNumber, text } from '../lib/format'
import { exportTable } from '../lib/export'
import { getVehicles, getVehicleStatuses } from '../services/vehicles'
import { notify } from '../utils/notify'

const RECENT_COUNT = 8

const ACTIONS: { label: string; description: string; to: string; icon: ReactNode; color: MantineColor }[] = [
  { label: 'Vehicles', description: 'Browse and search all vehicles', to: '/vehicles', icon: <IconTruck size={20} />, color: 'brand' },
  { label: 'Inactive vehicles', description: 'Devices reporting as inactive', to: '/vehicles?activity=inactive', icon: <IconPlugConnectedX size={20} />, color: 'red' },
]

type ExportKind = 'active' | 'inactive' | 'unfetched'

const EXPORT_LABEL: Record<ExportKind, string> = { active: 'active', inactive: 'inactive', unfetched: 'not-yet-fetched' }

/** IMEIs of vehicles that have no status record yet (the status list is joined to vehicles by id). */
async function loadUnfetchedImeis() {
  const [vehicles, statuses] = await Promise.all([
    fetchEveryPage((afterId, signal) => getVehicles({ afterId, take: FETCH_SIZE }, signal)),
    fetchEveryPage((afterId, signal) => getVehicleStatuses({ afterId, take: FETCH_SIZE }, signal)),
  ])
  const fetched = new Set(statuses.map((s) => s.vehicleListId))
  return vehicles.filter((v) => !fetched.has(v.id)).map((v) => v.imei)
}

/** Downloads just the IMEIs for one group of vehicles as an Excel file. */
async function exportImeis(kind: ExportKind) {
  const label = EXPORT_LABEL[kind]
  const raw =
    kind === 'unfetched'
      ? await loadUnfetchedImeis()
      : (
          await fetchEveryPage((afterId, signal) =>
            getVehicleStatuses({ afterId, take: FETCH_SIZE, isActive: kind === 'active' }, signal),
          )
        ).map((r) => r.imei)
  const imeis = [...new Set(raw.map((imei) => imei?.trim()).filter((imei): imei is string => Boolean(imei)))]
  if (imeis.length === 0) return notify.info(`There are no ${label} IMEIs to export.`, 'Nothing to export')
  await exportTable('xlsx', `${label}-imeis`, ['IMEI'], imeis.map((imei) => [imei]))
  notify.success(`${imeis.length.toLocaleString()} IMEIs exported.`, 'Export ready')
}

export default function DashboardPage() {
  const [exporting, setExporting] = useState<ExportKind | null>(null)
  const runExport = async (kind: ExportKind) => {
    setExporting(kind)
    try {
      await exportImeis(kind)
    } catch {
      notify.error('The IMEIs could not be exported. Please try again.', 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  const totals = useStatusSummary()
  // The API can sort by status time, so the latest reports are a single small request.
  const inactive = useCursorList('inactive', (_afterId, signal) =>
    getVehicleStatuses({ take: RECENT_COUNT, isActive: false, sort: 'statusDateTime_desc' }, signal),
  )
  const recentInactive = inactive.items

  const summary = totals.summary
  const noStatus = summary ? Math.max(summary.vehicles - summary.active - summary.inactive, 0) : 0
  const error = totals.error ?? inactive.error
  const refreshing = totals.isLoading || inactive.isLoading
  const reloadAll = () => {
    totals.reload()
    inactive.reload()
  }
  const listLoading = inactive.isLoading

  return (
    <>
      {error && (
        <div className="mb-6">
          <QueryError
            title="Unable to load some data"
            message={error.message}
            onRetry={reloadAll}
          />
        </div>
      )}

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }} spacing={{ base: 'sm', sm: 'lg' }}>
        <StatCard
          label="Total vehicles"
          value={formatNumber(summary?.vehicles)}
          icon={<IconTruck size={22} />}
          loading={totals.isLoading}
          hint={noStatus > 0 ? `${formatNumber(noStatus)} yet to be fetched` : undefined}
          actions={[
            // Only offered when some vehicles are still waiting for their first status.
            ...(noStatus > 0
              ? [
                  {
                    label: 'Export not-yet-fetched IMEIs to Excel',
                    icon: <IconDownload size={16} />,
                    onClick: () => void runExport('unfetched'),
                    loading: exporting === 'unfetched',
                    disabled: exporting !== null,
                  },
                ]
              : []),
            {
              label: 'Refresh dashboard',
              icon: <IconRefresh size={16} />,
              onClick: reloadAll,
              loading: refreshing,
            },
          ]}
        />
        <StatCard
          label="Active"
          value={formatNumber(summary?.active)}
          icon={<IconPlugConnected size={22} />}
          color="teal"
          loading={totals.isLoading}
          actions={[{
            label: 'Export active IMEIs to Excel',
            icon: <IconDownload size={16} />,
            onClick: () => void runExport('active'),
            loading: exporting === 'active',
            disabled: !summary?.active || exporting !== null,
          }]}
        />
        <StatCard
          label="Inactive"
          value={formatNumber(summary?.inactive)}
          icon={<IconPlugConnectedX size={22} />}
          color="red"
          loading={totals.isLoading}
          actions={[{
            label: 'Export inactive IMEIs to Excel',
            icon: <IconDownload size={16} />,
            onClick: () => void runExport('inactive'),
            loading: exporting === 'inactive',
            disabled: !summary?.inactive || exporting !== null,
          }]}
        />
      </SimpleGrid>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <SectionCard
          title="Inactive vehicles"
          description="Most recent inactive status records"
          action={
            <Anchor component={Link} to="/vehicles?activity=inactive" size="sm" fw={500}>
              View all
            </Anchor>
          }
        >
          {listLoading ? (
            <Stack gap="xs">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} h={32} />
              ))}
            </Stack>
          ) : recentInactive.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="lg">
              {inactive.error ? 'Inactive vehicles could not be loaded.' : 'No inactive vehicles found.'}
            </Text>
          ) : (
            <Table.ScrollContainer minWidth={360}>
              <Table verticalSpacing="xs" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>IMEI</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Status time</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentInactive.map((s) => (
                    <Table.Tr key={s.id}>
                      <Table.Td>
                        <Text size="sm" fw={600} ff="monospace">
                          {text(s.imei)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <ActivityBadge active={s.isActive} />
                      </Table.Td>
                      <Table.Td className="whitespace-nowrap">{formatDateTime(s.statusDateTime)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </SectionCard>

        <SectionCard title="Quick actions">
          <Stack gap={4}>
            {ACTIONS.map((action) => (
              <UnstyledButton
                key={action.to}
                component={Link}
                to={action.to}
                className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-[var(--app-surface)]"
              >
                <ThemeIcon variant="light" color={action.color} size={40} radius="md">
                  {action.icon}
                </ThemeIcon>
                <div className="min-w-0 flex-1">
                  <Text size="sm" fw={600}>
                    {action.label}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {action.description}
                  </Text>
                </div>
                <Group>
                  <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </SectionCard>
      </div>
    </>
  )
}
