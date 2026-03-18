import * as React from 'react'

type TextPreset = 'heading' | 'subheading' | 'body' | 'label' | 'code'

type TextProps<T extends React.ElementType = 'p'> = {
  as?: T
  preset?: TextPreset
  className?: string
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className'>

const presetClasses: Record<TextPreset, string> = {
  heading: 'text-[20px] font-semibold leading-[1.1] tracking-[-0.02em] text-text-primary text-balance',
  subheading: 'text-[14px] font-medium leading-6 text-text-primary',
  body: 'text-[14px] font-normal leading-6 text-text-secondary [text-wrap:pretty]',
  label: 'text-[12px] font-medium uppercase tracking-[0.18em] text-text-tertiary',
  code: 'font-mono text-[13px] font-normal leading-6 text-text-primary'
}

export function Text<T extends React.ElementType = 'p'>({
  as,
  className = '',
  preset = 'body',
  ...props
}: TextProps<T>) {
  const Comp = (as ?? 'p') as React.ElementType

  return <Comp className={[presetClasses[preset], className].join(' ')} {...props} />
}
