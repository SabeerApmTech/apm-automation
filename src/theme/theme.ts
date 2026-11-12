import { Badge, Button, Card, createTheme, type CSSVariablesResolver, Modal, Paper, Select, Tooltip } from '@mantine/core'

const fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 5 },
  colors: {
    brand: [
      '#ecf0ff',
      '#d6dcfb',
      '#aab6f2',
      '#7c8deb',
      '#5569e4',
      '#3c51e0',
      '#2e45df',
      '#2037c7',
      '#1931b2',
      '#0b299e',
    ],
  },
  fontFamily,
  headings: { fontFamily, fontWeight: '650' },
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Button: Button.extend({ defaultProps: { radius: 'md' } }),
    Card: Card.extend({ defaultProps: { withBorder: true, radius: 'lg', padding: 'lg' } }),
    Paper: Paper.extend({ defaultProps: { radius: 'lg' } }),
    Badge: Badge.extend({
      defaultProps: { radius: 'sm', variant: 'light' },
      styles: { root: { flexShrink: 0, minWidth: 'max-content' } },
    }),
    Modal: Modal.extend({
      defaultProps: { centered: true, radius: 'lg', overlayProps: { blur: 3, backgroundOpacity: 0.4 } },
    }),
    Select: Select.extend({ defaultProps: { checkIconPosition: 'right' } }),
    Tooltip: Tooltip.extend({ defaultProps: { withArrow: true, openDelay: 200 } }),
  },
})

export const cssVariablesResolver: CSSVariablesResolver = (t) => ({
  variables: {},
  light: {
    '--app-surface': t.colors.gray[0],
    '--app-border': t.colors.gray[2],
  },
  dark: {
    '--app-surface': t.colors.dark[8],
    '--app-border': t.colors.dark[5],
  },
})
