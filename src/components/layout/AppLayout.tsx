import {
  ActionIcon,
  AppShell,
  Burger,
  Container,
  getDefaultZIndex,
  Group,
  Menu,
  NavLink,
  Overlay,
  Progress,
  ScrollArea,
  Text,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconLayoutDashboard,
  IconMoon,
  IconLogout,
  IconSun,
  IconTruck,
  IconUser,
  type Icon,
} from '@tabler/icons-react'
import { useEffect, useRef } from 'react'
import { Link, NavLink as RouterLink, Outlet, useLocation, useMatches, useNavigation } from 'react-router'
import companySymbol from '../../assets/company-symbol.png'
import { signOut, useAuth } from '../../services/auth'
import { LAYOUT_BREAKPOINTS, useIsMobile, useIsTablet } from '../../hooks/useBreakpoints'

export interface RouteHandle {
  title: string
}

const NAVBAR_WIDTH = 264
const RAIL_WIDTH = 76

const NAVIGATION: { label: string; path: string; icon: Icon }[] = [
  { label: 'Dashboard', path: '/', icon: IconLayoutDashboard },
  { label: 'Vehicles', path: '/vehicles', icon: IconTruck },
]

const collapsedLinkStyles = {
  root: { justifyContent: 'center' },
  section: { marginInlineEnd: 0 },
  body: { display: 'none' },
}

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-inherit no-underline">
      <img src={companySymbol} alt="APM" width={34} height={34} className="shrink-0" />
      {!compact && (
        <div>
          <Text fw={700} size="md" lh={1.1}>
            APM Fleet Monitor
          </Text>
          <Text size="xs" lh={1.3} c="dimmed">
            Vehicle status monitoring
          </Text>
        </div>
      )}
    </Link>
  )
}

function UserMenu() {
  const { username } = useAuth()
  return (
    <Menu position="bottom-end" shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon variant="default" size="lg" aria-label="Account">
          <IconUser size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Signed in as {username}</Menu.Label>
        <Menu.Item leftSection={<IconLogout size={16} />} onClick={() => signOut()}>
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme()
  const isDark = useComputedColorScheme('light') === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Tooltip label={label}>
      <ActionIcon variant="default" size="lg" aria-label={label} onClick={() => setColorScheme(isDark ? 'light' : 'dark')}>
        {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  )
}

export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure()
  const isRail = useIsTablet()
  const isMobile = useIsMobile()
  const navigation = useNavigation()
  const railExpanded = isRail && opened
  const collapsed = isRail && !opened
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const handle = useMatches()
    .map((m) => m.handle as RouteHandle | undefined)
    .findLast((h) => h?.title)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  const activePath = NAVIGATION.find((item) =>
    item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`),
  )?.path

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: isRail ? RAIL_WIDTH : NAVBAR_WIDTH,
        breakpoint: LAYOUT_BREAKPOINTS.tablet - 0.02,
        collapsed: { mobile: !opened },
      }}
      padding={0}
      styles={{
        header: { borderColor: 'var(--app-border)', willChange: 'transform' },
        navbar: {
          borderColor: 'var(--app-border)',
          transition: 'width 200ms ease, box-shadow 200ms ease',
          ...(railExpanded && { width: NAVBAR_WIDTH, boxShadow: 'var(--mantine-shadow-xl)' }),
        },
        main: {
          background: 'var(--app-surface)',
          height: '100dvh',
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        },
      }}
    >
      <AppShell.Header>
        {navigation.state === 'loading' && (
          <Progress value={100} animated size={2} radius={0} pos="absolute" top={0} left={0} right={0} />
        )}
        <Group h="100%" justify="space-between" wrap="nowrap" gap={0}>
          <Group h="100%" gap={0} wrap="nowrap" className="min-w-0">
            <div
              className="flex h-full shrink-0 items-center px-4"
              style={{
                width: isMobile ? undefined : isRail ? RAIL_WIDTH : NAVBAR_WIDTH,
                justifyContent: isRail ? 'center' : undefined,
                borderRight: isMobile ? undefined : '1px solid var(--app-border)',
              }}
            >
              <Logo compact={isMobile || isRail} />
            </div>
            <Burger opened={opened} onClick={toggle} size="sm" aria-label="Toggle navigation" className="mx-3 xl:hidden" />
            <Text fw={700} fz={20} truncate className="min-w-0 pl-1 xl:pl-6">
              {handle?.title ?? 'Not found'}
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap" px="md">
            <ColorSchemeToggle />
            <UserMenu />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        <AppShell.Section grow component={ScrollArea} px={collapsed ? 'sm' : 'md'} py="md">
          {NAVIGATION.map(({ label, path, icon: NavIcon }) => (
            <Tooltip key={path} label={label} position="right" disabled={!collapsed} offset={12}>
              <NavLink
                component={RouterLink}
                to={path}
                label={label}
                aria-label={label}
                leftSection={<NavIcon size={collapsed ? 21 : 19} stroke={1.7} />}
                active={activePath === path}
                onClick={close}
                variant="light"
                fw={500}
                className="rounded-md"
                mb={4}
                styles={collapsed ? collapsedLinkStyles : undefined}
              />
            </Tooltip>
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      {railExpanded && <Overlay fixed backgroundOpacity={0.3} zIndex={getDefaultZIndex('app') - 1} onClick={close} />}

      <AppShell.Main ref={mainRef}>
        <Container size="xl" px={{ base: 'md', sm: 'lg', lg: 'xl' }} py={{ base: 'lg', sm: 'xl' }}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
