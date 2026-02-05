import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div>
      <h2>Home Page</h2>
      <p>Your TanStack Start app is running with Bun custom server!</p>
    </div>
  )
}
