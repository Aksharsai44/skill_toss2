import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
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
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    outline: 'border border-ink-200 hover:bg-ink-50',
  }[variant];

  const sizeClass = {
    sm: 'px-3 py-1.5 text-xs',
    md: '', // Let default from btn classes take over
    lg: 'px-6 py-3 text-base',
    icon: 'p-2',
  }[size];

  return (
    <button
      className={clsx(
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    >
      {Icon && <Icon className={clsx("w-4 h-4", size === 'sm' && "w-3.5 h-3.5")} />}
      {children}
    </button>
  );
}
