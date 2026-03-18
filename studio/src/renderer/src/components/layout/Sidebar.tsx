import { CaretDownIcon, FileJsxIcon, FileTsIcon, FolderNotchOpenIcon } from '@phosphor-icons/react'
import { Text } from '../ui/Text'

type TreeItem = {
  name: string
  depth: number
  kind: 'folder' | 'file'
  accent?: boolean
}

const items: TreeItem[] = [
  { name: 'src', depth: 0, kind: 'folder', accent: true },
  { name: 'components', depth: 1, kind: 'folder' },
  { name: 'layout', depth: 2, kind: 'folder' },
  { name: 'AppLayout.tsx', depth: 3, kind: 'file', accent: true },
  { name: 'CenterPanel.tsx', depth: 3, kind: 'file' },
  { name: 'Sidebar.tsx', depth: 3, kind: 'file' },
  { name: 'ui', depth: 2, kind: 'folder' },
  { name: 'Button.tsx', depth: 3, kind: 'file' },
  { name: 'Text.tsx', depth: 3, kind: 'file' },
  { name: 'tokens.ts', depth: 1, kind: 'file' }
]

export function Sidebar() {
  return (
    <aside className="flex h-full min-h-0 flex-col border-t border-border bg-[linear-gradient(180deg,rgba(17,17,17,0.98),rgba(10,10,10,0.94))]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3 text-text-primary">
          <FolderNotchOpenIcon className="text-accent" weight="duotone" />
          <Text as="h2" preset="subheading">
            Files
          </Text>
        </div>
        <Text as="span" preset="label">
          Workspace
        </Text>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border-t border-border px-3 py-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.kind === 'folder' ? FolderNotchOpenIcon : item.name.endsWith('.tsx') ? FileJsxIcon : FileTsIcon

            return (
              <li key={`${item.name}-${item.depth}`}>
                <button
                  className={[
                    'flex min-h-10 w-full items-center gap-2 rounded-[10px] px-3 text-left transition-[background-color,color] duration-150 ease-out hover:bg-bg-hover',
                    item.accent ? 'text-text-primary' : 'text-text-secondary'
                  ].join(' ')}
                  style={{ paddingLeft: `${12 + item.depth * 14}px` }}
                  type="button"
                >
                  {item.kind === 'folder' ? (
                    <CaretDownIcon size={14} className="shrink-0 text-text-tertiary" />
                  ) : (
                    <span className="w-[14px] shrink-0" />
                  )}
                  <Icon size={16} weight={item.kind === 'folder' ? 'duotone' : 'regular'} className={item.accent ? 'text-accent' : 'text-text-tertiary'} />
                  <span className="truncate text-[13px] font-medium">{item.name}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 rounded-[8px] border border-border bg-bg-secondary/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <Text preset="label">Pinned</Text>
          <Text className="mt-2">Drag files here later for focused workspace context and indexed search.</Text>
        </div>
      </div>
    </aside>
  )
}
