import { AppLayout } from './components/layout/AppLayout'
import { IconProvider } from './components/ui/Icon'

export default function App() {
  return (
    <IconProvider>
      <AppLayout />
    </IconProvider>
  )
}
