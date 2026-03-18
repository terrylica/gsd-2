import { Separator } from 'react-resizable-panels'

export function PanelHandle() {
  return (
    <Separator
      className="group relative flex w-3 shrink-0 cursor-col-resize items-center justify-center outline-none transition-colors duration-150 data-[dragging]:text-accent hover:text-accent focus-visible:text-accent"
      style={{ touchAction: 'none' }}
    >
      <div className="pointer-events-none relative flex h-full w-full items-center justify-center">
        <div className="h-full w-px rounded-full bg-current text-[color:var(--color-border)] transition-[width,color] duration-150 ease-out group-hover:w-[2px] group-data-[dragging]:w-[2px]" />
        <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col items-center justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[dragging]:opacity-100">
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
        </div>
      </div>
    </Separator>
  )
}
