import { Badge } from '@mantine/core'
import { stateTone, text } from '../../lib/format'

export function ActivityBadge({ active }: { active: boolean | null }) {
  if (active === null) return <Badge color="gray" variant="dot" tt="none" fw={500}>Unknown</Badge>
  return (
    <Badge color={active ? 'teal' : 'red'} variant="dot" tt="none" fw={500}>
      {active ? 'Active' : 'Inactive'}
    </Badge>
  )
}

/** Free-text device state such as ignition or main power. */
export function StateBadge({ value, neutralOff }: { value: string | null; neutralOff?: boolean }) {
  if (!value?.trim()) return <>{text(value)}</>
  return (
    <Badge color={neutralOff && stateTone(value) === 'red' ? 'gray' : stateTone(value)} tt="none" fw={500}>
      {value}
    </Badge>
  )
}
