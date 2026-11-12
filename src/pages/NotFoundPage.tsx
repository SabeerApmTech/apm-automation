import { Button, Card, Center, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconMapOff } from '@tabler/icons-react'
import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <Card>
      <Center py={56}>
        <Stack align="center" gap="xs" ta="center" maw={380}>
          <ThemeIcon variant="light" color="gray" size={52} radius="xl">
            <IconMapOff size={26} stroke={1.5} />
          </ThemeIcon>
          <Text fw={650}>Page not found</Text>
          <Text size="sm" c="dimmed">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </Text>
          <Button component={Link} to="/" mt="xs">
            Back to dashboard
          </Button>
        </Stack>
      </Center>
    </Card>
  )
}
