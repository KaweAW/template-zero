import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * shadcn-style button. `buttonVariants` can be applied to links, so a call to action is a real
 * <a> (works without JavaScript) and still looks like a button.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        accent: 'bg-accent text-accent-foreground hover:bg-accent/90',
        outline: 'border border-foreground/30 bg-transparent hover:bg-foreground/5',
        inverse: 'bg-background text-foreground hover:bg-background/90',
        outlineInverse: 'border border-white/70 bg-transparent text-white hover:bg-white/10',
        ghost: 'hover:bg-foreground/5',
      },
      size: {
        md: 'h-11 px-5 text-[0.9375rem]',
        lg: 'h-13 px-7 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
