import { ArrowUpRightIcon, ClockCountdownIcon, SparkleIcon, WrenchIcon } from '@phosphor-icons/react'
import { Button } from '../ui/Button'
import { Text } from '../ui/Text'

const conversationBullets = [
  'Layout persistence now survives reload through the resizable panel autosave layer.',
  'The center rail stays anchored while side panels can collapse without collapsing the conversation.',
  'All interactive accents stay restrained to amber so the shell reads like a desktop tool, not a landing page.'
]

export function CenterPanel() {
  return (
    <section className="flex h-full min-h-0 flex-col border-t border-border bg-[radial-gradient(circle_at_top,rgba(212,160,78,0.09),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Text as="h2" preset="subheading">
            Conversation
          </Text>
          <Text preset="label" className="mt-1">
            Active session
          </Text>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border bg-bg-secondary/80 px-3 py-1.5 text-text-tertiary shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <ClockCountdownIcon size={15} />
          <span className="text-[12px] font-medium">Now</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border-t border-border px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className="rounded-[12px] border border-[color:var(--color-accent-muted)] bg-[linear-gradient(180deg,rgba(17,17,17,0.95),rgba(10,10,10,0.92))] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent-muted)] px-3 py-1 text-accent">
              <SparkleIcon size={15} weight="duotone" />
              <Text as="span" preset="label" className="text-accent normal-case tracking-[0.1em]">
                Design system proof
              </Text>
            </div>

            <Text as="h1" preset="heading" className="text-[28px] leading-[1.05]">
              The shell reads like a premium desktop workspace, not a demo card.
            </Text>

            <Text className="mt-4 max-w-2xl">
              Typography stays disciplined, panel chrome stays quiet, and the accent only shows up where interaction matters. Inline code such as{' '}
              <code className="rounded-[6px] bg-bg-tertiary px-1.5 py-1 font-mono text-[13px] text-text-primary">autoSaveId</code>{' '}
              and{' '}
              <code className="rounded-[6px] bg-bg-tertiary px-1.5 py-1 font-mono text-[13px] text-text-primary">WebkitAppRegion</code>{' '}
              stays legible without blowing up the rhythm.
            </Text>

            <ul className="mt-5 space-y-3">
              {conversationBullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-text-secondary">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="text-[14px] leading-6">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[10px] border border-border bg-bg-secondary/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div className="flex items-center gap-3 text-text-primary">
              <WrenchIcon className="text-accent" weight="duotone" />
              <Text as="h3" preset="subheading">
                Tool invocation placeholder
              </Text>
            </div>
            <Text className="mt-3">Structured tool output will live here with timing, status, and diff surfaces once execution slices land.</Text>
            <div className="mt-4 rounded-[8px] border border-border bg-[#0b0b0b] p-4">
              <pre className="m-0 overflow-x-auto font-mono text-[13px] leading-6 text-[#e7d4b0]">{`const layout = useDefaultLayout({
  id: 'gsd-studio-layout',
  storage: localStorage
})

<Group orientation="horizontal" />`}</pre>
            </div>
          </div>

          <div className="rounded-[10px] border border-border bg-bg-secondary/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Text as="h3" preset="subheading">
                  Composer
                </Text>
                <Text preset="label" className="mt-1">
                  Placeholder input surface
                </Text>
              </div>
              <Button size="sm" variant="ghost" className="rounded-[8px] px-3">
                <ArrowUpRightIcon size={15} />
                History
              </Button>
            </div>

            <div className="mt-4 flex items-end gap-3 rounded-[8px] border border-border bg-bg-primary/90 p-3 shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
              <label className="flex-1 rounded-[6px] transition-shadow duration-150 focus-within:shadow-[0_0_0_2px_rgba(212,160,78,0.35)]">
                <span className="sr-only">Prompt</span>
                <textarea
                  className="min-h-24 w-full resize-none border-0 bg-transparent px-3 py-2 font-sans text-[14px] leading-6 text-text-primary outline-none ring-0 placeholder:text-text-tertiary focus-visible:outline-none"
                  defaultValue=""
                  placeholder="Ask Studio to reason about a slice, review a plan, or inspect a failing build."
                />
              </label>
              <Button className="rounded-[8px] px-4">
                <ArrowUpRightIcon size={16} weight="bold" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
