import { Alert, Button } from '@mantine/core'
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'

interface QueryErrorProps {
  message: string
  title?: string
  onRetry?: () => void
}

export function QueryError({ message, title = 'Unable to load data', onRetry }: QueryErrorProps) {
  return (
    <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title={title} radius="md">
      {message}
      {onRetry && (
        <Button display="block" mt="sm" size="xs" variant="white" color="red" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </Alert>
  )
}
