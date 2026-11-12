import { notifications } from '@mantine/notifications'
import { IconCheck, IconX } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { saveBlob } from '../lib/export'
import { ApiError } from '../services/http'
import { APP_FILE_NAME, downloadApp } from '../services/vehicles'

const NOTIFICATION_ID = 'app-download'
const TITLE = 'Downloading Automation app'
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(0)

/** Downloads the Automation desktop app, reporting progress in a notification. */
export function useAppDownload() {
  const [downloading, setDownloading] = useState(false)
  const active = useRef(false)

  const start = async () => {
    if (active.current) return
    active.current = true
    setDownloading(true)
    notifications.show({
      id: NOTIFICATION_ID,
      loading: true,
      title: TITLE,
      message: 'Starting…',
      autoClose: false,
      withCloseButton: false,
    })
    let lastPercent = -1
    try {
      const blob = await downloadApp((received, total) => {
        const percent = total ? Math.floor((received / total) * 100) : -1
        if (total && percent === lastPercent) return
        lastPercent = percent
        notifications.update({
          id: NOTIFICATION_ID,
          loading: true,
          title: TITLE,
          message: total ? `${percent}% · ${mb(received)} of ${mb(total)} MB` : `${mb(received)} MB`,
          autoClose: false,
          withCloseButton: false,
        })
      })
      saveBlob(blob, APP_FILE_NAME)
      notifications.update({
        id: NOTIFICATION_ID,
        loading: false,
        color: 'teal',
        icon: <IconCheck size={18} />,
        title: 'Download complete',
        message: `${APP_FILE_NAME} was saved to your downloads.`,
        autoClose: 5000,
        withCloseButton: true,
      })
    } catch (error) {
      notifications.update({
        id: NOTIFICATION_ID,
        loading: false,
        color: 'red',
        icon: <IconX size={18} />,
        title: 'Download failed',
        message: error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
        autoClose: 8000,
        withCloseButton: true,
      })
    } finally {
      active.current = false
      setDownloading(false)
    }
  }

  return { downloading, start }
}
