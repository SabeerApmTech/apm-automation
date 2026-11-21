import {
  ActionIcon,
  type ActionIconProps,
  Badge,
  Button,
  CloseButton,
  Indicator,
  Input,
  Menu,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { IconDotsVertical, IconDownload, IconFilter, IconRefresh, IconSearch } from '@tabler/icons-react'
import { type ComponentProps, type ReactNode, useState } from 'react'

export interface FilterField {
  key: string
  label: string
  type: 'segmented' | 'select'
  /** Locks the control, e.g. while a mode needs the current value. */
  disabled?: boolean
  data: { value: string; label: string }[]
}

export interface DataTableFilters {
  fields: FilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: () => void
  activeCount: number
}

export interface DataTableToolbarProps {
  title: string
  /** Total records, shown as a badge beside the title. */
  count?: number | null
  search?: { value: string; onChange: (value: string) => void; placeholder: string }
  filters?: DataTableFilters
  onRefresh?: () => void
  refreshing?: boolean
  /** Adds an export menu; `disabledReason` explains why it is unavailable. */
  exporter?: { onExport: () => void; busy?: boolean; disabledReason?: string }
  /** Primary button shown right after the search box. */
  primaryAction?: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }
  compact?: boolean
}

function CountBadge({ count }: { count?: number | null }) {
  if (count === null || count === undefined) return null
  return (
    <Badge variant="light" size="lg" ml="sm" tt="none" fw={600} component="span" className="align-middle">
      {count.toLocaleString()}
    </Badge>
  )
}

function ToolbarIcon({ label, size = 40, ...props }: { label: string } & ActionIconProps & ComponentProps<'button'>) {
  return (
    <Tooltip label={label}>
      <ActionIcon variant="light" radius="xl" aria-label={label} {...props} size={size} />
    </Tooltip>
  )
}

function FilterMenu({ fields, values, onChange, onReset, activeCount, size }: DataTableFilters & { size?: number }) {
  return (
    <Popover position="bottom-end" width={290} shadow="md" radius="md">
      <Indicator label={activeCount} size={17} disabled={!activeCount} offset={4}>
        <Popover.Target>
          <ToolbarIcon label="Filters" size={size}>
            <IconFilter size={19} stroke={1.6} />
          </ToolbarIcon>
        </Popover.Target>
      </Indicator>
      <Popover.Dropdown p="md">
        <Stack gap="md">
          {fields.map((field) =>
            field.type === 'segmented' ? (
              <Input.Wrapper key={field.key} label={field.label}>
                <SegmentedControl
                  fullWidth
                  mt={4}
                  size="xs"
                  data={field.data}
                  value={values[field.key]}
                  disabled={field.disabled}
                  onChange={(value) => onChange(field.key, value)}
                />
              </Input.Wrapper>
            ) : (
              <Select
                key={field.key}
                label={field.label}
                data={field.data}
                value={values[field.key] || null}
                disabled={field.disabled}
                onChange={(next) => onChange(field.key, next ?? '')}
                comboboxProps={{ withinPortal: false }}
              />
            ),
          )}
          <Button variant="light" color="gray" size="xs" onClick={onReset} disabled={!activeCount || fields.some((field) => field.disabled)}>
            Reset filters
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}

function ExportButton({ exporter, size }: { exporter: NonNullable<DataTableToolbarProps['exporter']>; size?: number }) {
  return (
    <ToolbarIcon
      label={exporter.disabledReason ?? 'Export to Excel'}
      size={size}
      loading={exporter.busy}
      disabled={Boolean(exporter.disabledReason)}
      onClick={exporter.onExport}
    >
      <IconDownload size={19} stroke={1.6} />
    </ToolbarIcon>
  )
}

function CompactToolbar({ title, count, search, filters, onRefresh, refreshing, exporter, primaryAction }: DataTableToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(Boolean(search?.value))

  if (search && searchOpen) {
    return (
      <div className="flex items-center gap-2 px-4 py-3">
        <TextInput
          className="flex-1"
          radius="xl"
          variant="filled"
          autoFocus
          placeholder={search.placeholder}
          aria-label={search.placeholder}
          value={search.value}
          onChange={(event) => search.onChange(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
        />
        <CloseButton
          size="lg"
          radius="xl"
          aria-label="Close search"
          onClick={() => {
            search.onChange('')
            setSearchOpen(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <Text fw={700} fz="lg" truncate className="min-w-0 flex-1">
        {title}
        <CountBadge count={count} />
      </Text>
      {search && (
        <Indicator size={9} disabled={!search.value} offset={6}>
          <ToolbarIcon label="Search" size={36} onClick={() => setSearchOpen(true)}>
            <IconSearch size={18} stroke={1.6} />
          </ToolbarIcon>
        </Indicator>
      )}
      {primaryAction && (
        <ToolbarIcon label={primaryAction.label} size={36} variant="filled" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
          {primaryAction.icon}
        </ToolbarIcon>
      )}
      {filters && <FilterMenu {...filters} size={36} />}
      {exporter && <ExportButton exporter={exporter} size={36} />}
      {onRefresh && (
        <Menu position="bottom-end" shadow="md" radius="md" width={190}>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" radius="xl" size={36} aria-label="More actions" loading={refreshing}>
              <IconDotsVertical size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconRefresh size={16} />} onClick={onRefresh}>
              Reload
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </div>
  )
}

function FullToolbar({ title, count, search, filters, onRefresh, refreshing, exporter, primaryAction }: DataTableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-3 px-6 py-4">
      <Text fw={700} fz="lg" className="order-1 flex-auto shrink-0 whitespace-nowrap lg:mr-4">
        {title}
        <CountBadge count={count} />
      </Text>

      <div className="order-2 flex shrink-0 items-center gap-2 lg:order-6">
        {exporter && <ExportButton exporter={exporter} />}
        {onRefresh && (
          <ToolbarIcon label="Reload" onClick={onRefresh} loading={refreshing}>
            <IconRefresh size={19} stroke={1.6} />
          </ToolbarIcon>
        )}
      </div>

      {(search || filters) && <div className="order-3 basis-full lg:hidden" />}

      {search && (
        <TextInput
          className="order-4 flex-1 lg:order-2 lg:max-w-72 lg:min-w-44"
          radius="xl"
          variant="filled"
          placeholder={search.placeholder}
          aria-label={search.placeholder}
          value={search.value}
          onChange={(event) => search.onChange(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          rightSection={search.value && <CloseButton size="sm" aria-label="Clear search" onClick={() => search.onChange('')} />}
        />
      )}
      {primaryAction && (
        <Button className="order-5 lg:order-3" leftSection={primaryAction.icon} onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
          {primaryAction.label}
        </Button>
      )}
      {filters && (
        <div className="order-5 lg:order-4">
          <FilterMenu {...filters} />
        </div>
      )}
    </div>
  )
}

export function DataTableToolbar({ compact, ...props }: DataTableToolbarProps) {
  return compact ? <CompactToolbar {...props} /> : <FullToolbar {...props} />
}
