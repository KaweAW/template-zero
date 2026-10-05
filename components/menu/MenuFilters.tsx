import { cn } from '@/lib/utils';
import type { DietTag } from '@/types';
import { TagBadge, type MenuLabels } from './MenuItem';

interface Props {
  available: DietTag[];
  active: DietTag[];
  labels: MenuLabels;
  onToggle: (tag: DietTag) => void;
  onClear: () => void;
}

/** Toggle chips. Each one shows its short code so the badges on the dishes explain themselves. */
export function MenuFilters({ available, active, labels, onToggle, onClear }: Props) {
  if (available.length === 0) return null;

  return (
    <div role="group" aria-label={labels.filters} className="flex flex-wrap items-center gap-2">
      {available.map((tag) => {
        const pressed = active.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggle(tag)}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-md border px-3.5 text-[0.9375rem] transition-colors',
              pressed
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-foreground/30 hover:bg-foreground/5',
            )}
          >
            <span className={cn(pressed && 'invert')}>
              <TagBadge tag={tag} labels={labels} />
            </span>
            {labels.tags[tag].long}
          </button>
        );
      })}
      {active.length > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="h-11 px-2 text-[0.9375rem] font-medium underline underline-offset-4"
        >
          {labels.clear}
        </button>
      ) : null}
    </div>
  );
}
