import { Card, Group, Text } from '@mantine/core'
import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  children: ReactNode
}

export function SectionCard({ title, description, action, icon, children }: SectionCardProps) {
  return (
    <Card>
      <Group justify="space-between" align="flex-start" gap="sm" mb="md" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" align="flex-start" className="min-w-0">
          {icon}
          <div className="min-w-0">
            <Text fw={650}>{title}</Text>
            {description && (
              <Text size="sm" c="dimmed" mt={2}>
                {description}
              </Text>
            )}
          </div>
        </Group>
        {action}
      </Group>
      {children}
    </Card>
  )
}
