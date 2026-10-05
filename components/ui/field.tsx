import { cn } from '@/lib/utils';

const control =
  'block w-full rounded-md border border-foreground/30 bg-background px-3.5 text-base text-foreground placeholder:text-muted/70 disabled:opacity-60 aria-[invalid=true]:border-accent';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(control, 'h-12', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 py-3', className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(control, 'h-12 appearance-none bg-no-repeat pr-10', className)}
      {...props}
    >
      {children}
    </select>
  );
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error. The error is announced to screen readers when it appears. */
export function Field({ id, label, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
