import { Text } from '../ui/Text'

export function TitleBar() {
  return (
    <header
      className="flex h-[38px] shrink-0 items-center justify-between border-b border-border bg-bg-secondary pr-4"
      style={{ paddingLeft: '78px', WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Text as="span" preset="label" className="text-accent normal-case tracking-[0.12em]">
          GSD Studio
        </Text>
      </div>

      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="h-2 w-2 rounded-full bg-[rgba(212,160,78,0.42)]" />
        <div className="h-5 min-w-24 rounded-full border border-border bg-bg-tertiary/80 px-3" />
      </div>
    </header>
  )
}
