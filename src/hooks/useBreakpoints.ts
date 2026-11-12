import { useMediaQuery } from '@mantine/hooks'

export const LAYOUT_BREAKPOINTS = { tablet: 768, desktop: 1280 } as const

const MEDIA = {
  mobile: `(max-width: ${LAYOUT_BREAKPOINTS.tablet - 0.02}px)`,
  tablet: `(min-width: ${LAYOUT_BREAKPOINTS.tablet}px) and (max-width: ${LAYOUT_BREAKPOINTS.desktop - 0.02}px)`,
} as const

const options = { getInitialValueInEffect: false }

export const useIsMobile = () => useMediaQuery(MEDIA.mobile, false, options)

export const useIsTablet = () => useMediaQuery(MEDIA.tablet, false, options)
