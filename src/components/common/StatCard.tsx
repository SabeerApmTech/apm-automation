import { ActionIcon, Card, Group, Skeleton, Stack, Text, ThemeIcon, Tooltip, type MantineColor } from '@mantine/core'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: ReactNode
  color?: MantineColor
  loading?: boolean
  hint?: string
  /** Small icon button under the card icon, e.g. an export. */
  actions?: { label: string; icon: ReactNode; onClick: () => void; loading?: boolean; disabled?: boolean }[]
}

export function StatCard({ label, value, icon, color = 'brand', loading, hint, actions }: StatCardProps) {
  return (
    <Card>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <div className="min-w-0">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.4}>
            {label}
          </Text>
          {loading ? (
            <Skeleton h={30} w={72} mt={8} />
          ) : (
            <Text fz={{ base: 22, sm: 28 }} fw={700} lh={1.2} mt={4} className="tabular-nums">
              {value}
            </Text>
          )}
          {hint && (
            <Text size="xs" c="dimmed" mt={2}>
              {hint}
            </Text>
          )}
        </div>
        <Stack gap="xs" align="flex-end">
          <ThemeIcon variant="light" color={color} size={42} radius="md" visibleFrom="xs">
            {icon}
          </ThemeIcon>
          {actions && (
            <Group gap={6}>
              {actions.map((action) => (
                <Tooltip key={action.label} label={action.label}>
                  <ActionIcon
                    variant="light"
                    color={color}
                    radius="xl"
                    aria-label={action.label}
                    onClick={action.onClick}
                    loading={action.loading}
                    disabled={action.disabled}
                  >
                    {action.icon}
                  </ActionIcon>
                </Tooltip>
              ))}
            </Group>
          )}
        </Stack>
      </Group>
    </Card>
  )
}
