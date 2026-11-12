import { Button, Container } from '@mantine/core'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { QueryError } from '../components/common/QueryError'

export default function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <Container size="sm" py="xl">
      <QueryError title="This page crashed" message={message} />
      <Button component={Link} to="/" variant="light" mt="md">
        Go home
      </Button>
    </Container>
  )
}
