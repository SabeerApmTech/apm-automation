import { SimpleGrid, Text } from '@mantine/core'
import type { ReactNode } from 'react'

export function DetailGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="md">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 wrap-break-word">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.3} mb={2}>
            {label}
          </Text>
          <Text component="div" size="sm">
            {value}
          </Text>
        </div>
      ))}
    </SimpleGrid>
  )
}
