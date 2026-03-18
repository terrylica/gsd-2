import * as React from 'react'
import { IconContext } from '@phosphor-icons/react'

const defaultIconContext = {
  color: 'currentColor',
  size: 18,
  weight: 'regular' as const
}

export function IconProvider({ children }: { children: React.ReactNode }) {
  return <IconContext.Provider value={defaultIconContext}>{children}</IconContext.Provider>
}

export { IconContext, defaultIconContext }
