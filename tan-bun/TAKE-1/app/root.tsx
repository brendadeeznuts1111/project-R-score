import { createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div>
      <h1>Welcome to TanStack Start with Bun!</h1>
      <p>This is a custom server setup.</p>
    </div>
  )
}
