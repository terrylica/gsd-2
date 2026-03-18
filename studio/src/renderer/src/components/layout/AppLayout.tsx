import { Group, Panel, useDefaultLayout } from 'react-resizable-panels'
import { CenterPanel } from './CenterPanel'
import { PanelHandle } from './PanelHandle'
import { RightPanel } from './RightPanel'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'

export function AppLayout() {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'gsd-studio-layout',
    panelIds: ['files', 'conversation', 'editor'],
    storage: window.localStorage
  })

  return (
    <div className="flex h-screen flex-col bg-bg-primary text-text-primary">
      <TitleBar />
      <div className="min-h-0 flex-1">
        <Group
          className="h-full"
          defaultLayout={defaultLayout}
          id="gsd-studio-layout"
          onLayoutChanged={onLayoutChanged}
          orientation="horizontal"
        >
          <Panel collapsible defaultSize="20%" id="files" minSize="15%">
            <Sidebar />
          </Panel>

          <PanelHandle />

          <Panel defaultSize="50%" id="conversation" minSize="30%">
            <CenterPanel />
          </Panel>

          <PanelHandle />

          <Panel collapsible defaultSize="30%" id="editor" minSize="20%">
            <RightPanel />
          </Panel>
        </Group>
      </div>
    </div>
  )
}
