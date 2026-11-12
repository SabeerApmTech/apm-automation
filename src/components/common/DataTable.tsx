import { Box, Button, Card, Center, Group, SimpleGrid, Skeleton, Stack, Table, Text, ThemeIcon } from '@mantine/core'
import { IconDatabaseOff } from '@tabler/icons-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { useIsMobile } from '../../hooks/useBreakpoints'
import type { ApiError } from '../../services/http'
import { formatNumber } from '../../lib/format'
import classes from './DataTable.module.css'
import { DataTableToolbar, type DataTableToolbarProps } from './DataTableToolbar'
import { QueryError } from './QueryError'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  hideOnMobile?: boolean
}

interface DataTableProps<T> extends Omit<DataTableToolbarProps, 'compact'> {
  data: T[]
  columns: DataTableColumn<T>[]
  rowKey: (row: T) => string | number
  loading?: boolean
  error?: ApiError | null
  errorTitle: string
  /** Makes whole rows clickable (and keyboard-activatable). */
  onRowClick?: (row: T) => void
  empty: { title: string; description: string; action?: ReactNode }
  noun: string
  hasMore: boolean
  loadingMore: boolean
  loadMoreError: ApiError | null
  onLoadMore: () => void
  /** Replaces the default "N loaded" footer text. */
  summary?: string
  /** Shown between the toolbar and the rows, e.g. warnings or progress. */
  banner?: ReactNode
}

const SKELETON_ROWS = 6
const BODY_MAX_HEIGHT = 'calc(100dvh - 300px)'

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading,
  error,
  errorTitle,
  onRowClick,
  empty,
  noun,
  hasMore,
  loadingMore,
  loadMoreError,
  onLoadMore,
  summary,
  banner,
  ...toolbar
}: DataTableProps<T>) {
  const isMobile = useIsMobile()
  const hasRows = data.length > 0

  const rowProps = (row: T) =>
    onRowClick
      ? {
          className: classes.clickable,
          tabIndex: 0,
          onClick: () => onRowClick(row),
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (event.target !== event.currentTarget) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onRowClick(row)
            }
          },
        }
      : {}

  const renderBody = () => {
    if (error) {
      return (
        <Box p="md">
          <QueryError title={errorTitle} message={error.message} onRetry={toolbar.onRefresh} />
        </Box>
      )
    }

    if (loading) {
      return (
        <Stack gap="xs" p="md" aria-busy="true" aria-label="Loading">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <Skeleton key={i} h={isMobile ? 64 : 36} radius="sm" />
          ))}
        </Stack>
      )
    }

    if (!hasRows) {
      return (
        <Center py={56} px="md">
          <Stack align="center" gap="xs" ta="center" maw={380}>
            <ThemeIcon variant="light" color="gray" size={52} radius="xl">
              <IconDatabaseOff size={26} stroke={1.5} />
            </ThemeIcon>
            <Text fw={650}>{empty.title}</Text>
            <Text size="sm" c="dimmed">
              {empty.description}
            </Text>
            {empty.action}
          </Stack>
        </Center>
      )
    }

    if (isMobile) {
      const [primary, ...rest] = columns
      const details = rest.filter((c) => !c.hideOnMobile)
      return data.map((row) => (
        <Box key={rowKey(row)} p="md" className={classes.mobileRow} {...rowProps(row)}>
          <Box miw={0} className="wrap-break-word">
            {primary.render(row)}
          </Box>
          {details.length > 0 && (
            <SimpleGrid cols={2} mt="sm" spacing="md" verticalSpacing="sm">
              {details.map((column) => (
                <div key={column.key} className="min-w-0 wrap-break-word">
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.3} mb={2}>
                    {column.header}
                  </Text>
                  <Box fz="sm">{column.render(row)}</Box>
                </div>
              ))}
            </SimpleGrid>
          )}
        </Box>
      ))
    }

    return (
      <Box className={classes.scroller} mah={BODY_MAX_HEIGHT}>
        <Table className={classes.table} stickyHeader verticalSpacing="sm" horizontalSpacing="md" highlightOnHover miw="100%" w="max-content">
          <Table.Thead>
            <Table.Tr>
              {columns.map((column) => (
                <Table.Th key={column.key}>{column.header}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((row) => (
              <Table.Tr key={rowKey(row)} {...rowProps(row)}>
                {columns.map((column) => (
                  <Table.Td key={column.key}>{column.render(row)}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    )
  }

  return (
    <Card padding={0} style={isMobile ? { overflow: 'visible' } : undefined}>
      <Box className={isMobile ? classes.stickyToolbar : undefined} style={{ borderBottom: '1px solid var(--app-border)' }}>
        <DataTableToolbar {...toolbar} compact={isMobile} refreshing={toolbar.refreshing || loading} />
      </Box>
      {banner}
      {renderBody()}
      {!error && !loading && hasRows && (
        <Stack gap="xs" px={{ base: 'md', sm: 'lg' }} py="sm" style={{ borderTop: '1px solid var(--app-border)' }}>
          {loadMoreError && <QueryError title="Couldn't load more" message={loadMoreError.message} onRetry={onLoadMore} />}
          <Group justify="space-between" gap="sm">
            <Text size="sm" c="dimmed">
              {summary ??
                `${formatNumber(data.length)} ${noun}${data.length === 1 ? '' : 's'} loaded${hasMore ? ' · more available' : ''}`}
            </Text>
            {hasMore && (
              <Button variant="light" size="xs" onClick={onLoadMore} loading={loadingMore}>
                Load more
              </Button>
            )}
          </Group>
        </Stack>
      )}
    </Card>
  )
}
