import { notifications } from '@mantine/notifications'
import { IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react'

export const notify = {
  success: (message: string, title = 'Success') =>
    notifications.show({ title, message, color: 'teal', icon: <IconCheck size={18} /> }),
  info: (message: string, title = 'Heads up') =>
    notifications.show({ title, message, color: 'blue', icon: <IconInfoCircle size={18} /> }),
  error: (message: string, title = 'Something went wrong') =>
    notifications.show({ title, message, color: 'red', icon: <IconX size={18} />, autoClose: 8000 }),
}
