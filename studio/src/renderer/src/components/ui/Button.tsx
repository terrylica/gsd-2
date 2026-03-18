import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = React.ComponentPropsWithRef<'button'> & {
  asChild?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-[#120f09] shadow-[0_10px_28px_rgba(212,160,78,0.22)] hover:bg-accent-hover focus-visible:ring-accent/40',
  secondary:
    'border border-border bg-bg-secondary text-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-[color:var(--color-border-active)] hover:bg-bg-hover hover:text-text-primary focus-visible:ring-accent/30',
  ghost:
    'bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:ring-accent/25'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-xl px-3 text-[12px] font-medium',
  md: 'h-10 rounded-[14px] px-4 text-[13px] font-medium',
  lg: 'h-12 rounded-[16px] px-5 text-[14px] font-medium'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { asChild = false, className = '', disabled, size = 'md', type = 'button', variant = 'primary', ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={[
        'inline-flex min-w-10 items-center justify-center gap-2 whitespace-nowrap antialiased transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
        'active:scale-[0.96] disabled:pointer-events-none disabled:opacity-45',
        variantClasses[variant],
        sizeClasses[size],
        className
      ].join(' ')}
      disabled={disabled}
      ref={ref}
      type={asChild ? undefined : type}
      {...props}
    />
  )
})
