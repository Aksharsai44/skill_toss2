import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    outline: 'btn bg-white text-ink-700 border border-ink-300 hover:bg-ink-50 hover:border-ink-400 px-4 py-2.5 text-sm',
  }[variant];

  const sizeClass = {
    sm: 'px-3 py-1.5 text-xs',
    md: '', // Let default from btn classes take over
    lg: 'px-6 py-3 text-base',
    // Square, and large enough to be a comfortable touch target on its own.
    icon: 'p-0 w-11 h-11 justify-center',
  }[size];

  if (import.meta.env.DEV && size === 'icon' && !props['aria-label'] && !props['aria-labelledby'] && !children) {
    console.warn('Button: size="icon" with no children needs an aria-label so the action has an accessible name.');
  }

  return (
    <button
      type={type}
      className={cn(
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    >
      {Icon && <Icon className={cn("w-4 h-4", size === 'sm' && "w-3.5 h-3.5")} />}
      {children}
    </button>
  );
}
