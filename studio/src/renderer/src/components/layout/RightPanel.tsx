import { BracketsCurlyIcon } from '@phosphor-icons/react'
import { Text } from '../ui/Text'

const codeLines = [
  "import { Group, Panel, Separator } from 'react-resizable-panels'",
  '',
  'export function StudioSurface() {',
  '  return (',
  '    <Group id="gsd-studio-layout" orientation="horizontal">',
  '      <Panel id="files" defaultSize="20%" minSize="15%" collapsible>',
  '        <Sidebar />',
  '      </Panel>',
  '      <Separator />',
  '      <Panel id="conversation" defaultSize="50%" minSize="30%">',
  '        <CenterPanel />',
  '      </Panel>',
  '      <Separator />',
  '      <Panel id="editor" defaultSize="30%" minSize="20%" collapsible>',
  '        <RightPanel />',
  '      </Panel>',
  '    </Group>',
  '  )',
  '}'
]

export function RightPanel() {
  return (
    <section className="flex h-full min-h-0 flex-col border-t border-border bg-[linear-gradient(180deg,rgba(9,9,9,0.96),rgba(15,15,15,0.98))]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3 text-text-primary">
          <BracketsCurlyIcon className="text-accent" weight="duotone" />
          <Text as="h2" preset="subheading">
            Editor
          </Text>
        </div>
        <Text as="span" preset="label">
          Preview buffer
        </Text>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border-t border-border px-0 py-4 font-mono text-[13px] leading-7 text-text-primary">
        {codeLines.map((line, index) => (
          <div key={`${index + 1}-${line}`} className="grid grid-cols-[52px_minmax(0,1fr)] items-start px-5 hover:bg-white/[0.02]">
            <span className="select-none pr-4 text-right tabular-nums text-text-tertiary">{String(index + 1).padStart(2, '0')}</span>
            <code className="whitespace-pre-wrap break-words py-[1px]">{line || ' '}</code>
          </div>
        ))}
      </div>
    </section>
  )
}
