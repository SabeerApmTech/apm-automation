import { ActionIcon, Alert, Button, Card, Group, Popover, Stack, Text, TextInput, Tooltip } from '@mantine/core'
import { IconAlertTriangle, IconEye, IconEyeOff, IconPencil, IconSettings } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { formatDateTime } from '../../lib/format'
import { ApiError } from '../../services/http'
import { updateSurakshaMitrCredential } from '../../services/vehicles'
import type { SurakshaMitrCredential } from '../../types/api'
import { notify } from '../../utils/notify'

/** Settings icon next to the profile menu: shows the Suraksha Mitr login, editable via the pencil. */
export function CredentialMenu({ credential, onSaved }: { credential: SurakshaMitrCredential | null; onSaved: () => void }) {
  const [opened, setOpened] = useState(false)
  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" width={340} shadow="md" radius="md">
      <Popover.Target>
        <Tooltip label="Suraksha Mitr login">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Suraksha Mitr login"
            onClick={() => setOpened((o) => !o)}
          >
            <IconSettings size={18} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        {/* Remounts on every open so the fields always start from the saved values. */}
        {opened && <CredentialCard credential={credential} onSaved={onSaved} />}
      </Popover.Dropdown>
    </Popover>
  )
}

function CredentialCard({ credential, onSaved }: { credential: SurakshaMitrCredential | null; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState(credential?.username ?? '')
  const [password, setPassword] = useState(credential?.password ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => {
    setEditing(false)
    setUsername(credential?.username ?? '')
    setPassword(credential?.password ?? '')
    setError(null)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter both the username and the password.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateSurakshaMitrCredential({ username: username.trim(), password })
      notify.success('The Suraksha Mitr login was updated.', 'Saved')
      setEditing(false)
      onSaved()
    } catch (e) {
      if (e instanceof ApiError && /no change is needed/i.test(e.message)) {
        // The API reports an unchanged, already-working login as a rejection; it isn't a failure.
        notify.info(e.message, 'No change needed')
        setEditing(false)
      } else {
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card p="md" withBorder={false}>
      <form onSubmit={submit} noValidate>
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text fw={650}>Suraksha Mitr login</Text>
              {credential?.updatedAt && (
                <Text size="xs" c="dimmed">
                  Updated {formatDateTime(credential.updatedAt)}
                </Text>
              )}
            </div>
            {!editing && (
              <Tooltip label="Edit">
                <ActionIcon variant="light" aria-label="Edit login" onClick={() => setEditing(true)}>
                  <IconPencil size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>

          {error && (
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
              {error}
            </Alert>
          )}

          <TextInput
            label="Username"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            disabled={!editing || saving}
          />
          <TextInput
            label="Password"
            autoComplete="new-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            disabled={!editing || saving}
            rightSection={
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </ActionIcon>
            }
          />

          {editing && (
            <Group justify="flex-end" gap="xs">
              <Button variant="default" size="xs" onClick={cancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" size="xs" loading={saving}>
                Save
              </Button>
            </Group>
          )}
        </Stack>
      </form>
    </Card>
  )
}
