import { Alert, Button, Card, PasswordInput, Stack, Text, TextInput } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import companySymbol from '../assets/company-symbol.png'
import { basicHeader, signIn, useAuth } from '../services/auth'
import { ApiError } from '../services/http'
import { getVehicles } from '../services/vehicles'

export default function LoginPage() {
  const { notice } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    setSubmitting(true)
    setError(null)
    const header = basicHeader(username.trim(), password)
    try {
      // The API has no login endpoint, so a cheap authenticated request verifies the credentials.
      await getVehicles({ take: 1 }, undefined, header)
      signIn(username.trim(), header)
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'Incorrect username or password.'
          : e instanceof ApiError
            ? e.message
            : 'Something went wrong. Please try again.',
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-(--app-surface) px-4 py-10">
      <Card w="100%" maw={400} p="xl">
        <form onSubmit={submit} noValidate>
          <Stack gap="md">
            <Stack gap={6} align="center" ta="center">
              <img src={companySymbol} alt="APM" width={48} height={48} />
              <Text fw={700} fz={22}>
                APM Fleet Monitor
              </Text>
              <Text size="sm" c="dimmed">
                Sign in to continue
              </Text>
            </Stack>

            {(error ?? notice) && (
              <Alert color={error ? 'red' : 'yellow'} variant="light" icon={<IconAlertTriangle size={18} />}>
                {error ?? notice}
              </Alert>
            )}

            <TextInput
              label="Username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              disabled={submitting}
            />
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              disabled={submitting}
            />
            <Button type="submit" fullWidth loading={submitting}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Card>
    </div>
  )
}
