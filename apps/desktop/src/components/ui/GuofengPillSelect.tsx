import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { GameIcon } from '../icons/index.js';

export interface GuofengPillSelectOption {
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
}

export interface GuofengPillSelectProps {
  readonly id?: string;
  readonly label?: string;
  readonly ariaLabel: string;
  readonly value: string;
  readonly options: readonly GuofengPillSelectOption[];
  readonly disabled?: boolean;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

interface PopoverCoords {
  readonly top?: number;
  readonly bottom?: number;
  readonly left: number;
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly maxHeight: number;
}

export function GuofengPillSelect({
  id,
  label,
  ariaLabel,
  value,
  options,
  disabled = false,
  onChange,
  className = '',
}: GuofengPillSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inDialog, setInDialog] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const generatedId = useId();
  const triggerId = id ?? `${generatedId}-trigger`;
  const labelId = `${generatedId}-label`;
  const listboxId = `${generatedId}-listbox`;

  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );
  const selectedOption = options[selectedIndex];

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const updatePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const dialogHost = trigger.closest('dialog');
    setInDialog(Boolean(dialogHost));

    const rect = trigger.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    const openUpward = spaceBelow < 210 && spaceAbove > spaceBelow;
    const desiredWidth = Math.max(rect.width, 196);
    const maxAllowedWidth = Math.max(160, viewportW - 24);
    const maxWidth = Math.min(340, maxAllowedWidth);
    const clampedLeft = Math.max(
      12,
      Math.min(rect.left, viewportW - Math.min(desiredWidth, maxWidth) - 12),
    );
    const maxHeight = Math.max(
      120,
      Math.min(272, openUpward ? spaceAbove : spaceBelow),
    );

    if (openUpward) {
      setCoords({
        bottom: viewportH - rect.top + 6,
        left: clampedLeft,
        minWidth: Math.min(rect.width, maxWidth),
        maxWidth,
        maxHeight,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left: clampedLeft,
        minWidth: Math.min(rect.width, maxWidth),
        maxWidth,
        maxHeight,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    updatePlacement();
    setActiveIndex(selectedIndex);
  }, [isOpen, selectedIndex, updatePlacement]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const frameId = requestAnimationFrame(() => {
      optionRefs.current[selectedIndex]?.focus({ preventScroll: true });
    });

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (
        containerRef.current?.contains(target) ||
        listboxRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu(false);
    }

    function handleWindowChange(): void {
      updatePlacement();
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [closeMenu, isOpen, selectedIndex, updatePlacement]);

  function openMenu(initialIndex = selectedIndex): void {
    if (disabled || options.length === 0) {
      return;
    }
    setActiveIndex(Math.max(0, Math.min(options.length - 1, initialIndex)));
    setIsOpen(true);
  }

  function commitSelection(option: GuofengPillSelectOption): void {
    if (option.value !== value) {
      onChange(option.value);
    }
    closeMenu(true);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (disabled) {
      return;
    }
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu(isOpen ? (activeIndex + 1) % options.length : selectedIndex);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(
        isOpen
          ? (activeIndex - 1 + options.length) % options.length
          : selectedIndex,
      );
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen) {
        closeMenu(true);
      } else {
        openMenu(selectedIndex);
      }
    }
  }

  function handleListboxKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (options.length === 0) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (event.key === 'Tab') {
      closeMenu(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (activeIndex + 1) % options.length;
      setActiveIndex(next);
      optionRefs.current[next]?.focus();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = (activeIndex - 1 + options.length) % options.length;
      setActiveIndex(next);
      optionRefs.current[next]?.focus();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      optionRefs.current[0]?.focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      const last = options.length - 1;
      setActiveIndex(last);
      optionRefs.current[last]?.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const chosen = options[activeIndex];
      if (chosen) {
        commitSelection(chosen);
      }
    }
  }

  const listboxPanel = isOpen ? (
    <div
      ref={listboxRef}
      id={listboxId}
      role="listbox"
      aria-label={ariaLabel}
      onKeyDown={handleListboxKeyDown}
      style={
        inDialog
          ? undefined
          : {
              position: 'fixed',
              zIndex: 90,
              top: coords?.top,
              bottom: coords?.bottom,
              left: coords?.left ?? 12,
              minWidth: coords?.minWidth ?? 196,
              maxWidth: coords?.maxWidth ?? 340,
              maxHeight: coords?.maxHeight ?? 256,
            }
      }
      className={`lkdf-scroll flex flex-col gap-1 overflow-y-auto rounded-lg border border-[#C89B4B]/75 bg-[#16110E] p-1.5 text-[#F5EBD6] shadow-[0_16px_40px_rgba(0,0,0,0.88)] ${
        inDialog
          ? 'absolute right-0 bottom-full z-50 mb-1.5 max-h-60 min-w-full max-w-[min(320px,calc(100vw-24px))]'
          : ''
      }`}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isActive = index === activeIndex;
        return (
          <button
            key={option.value}
            ref={(el) => {
              optionRefs.current[index] = el;
            }}
            type="button"
            role="option"
            aria-selected={isSelected}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => commitSelection(option)}
            className={`flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-md border px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#E6BE6C] ${
              isSelected
                ? 'border-[#C89B4B]/70 bg-[#5B231E]/85 text-[#FDE68A]'
                : isActive
                  ? 'border-[#806345]/75 bg-[#271C15] text-[#FFF4DE]'
                  : 'border-transparent bg-transparent text-[#EFE6D5] hover:bg-[#221913]'
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{option.label}</span>
              {option.detail ? (
                <span className="mt-0.5 block truncate text-[11px] text-[#D5C3A5]">
                  {option.detail}
                </span>
              ) : null}
            </span>
            {isSelected ? (
              <GameIcon
                name="ui:check"
                size={13}
                className="shrink-0 text-[#E6BE6C]"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div
      ref={containerRef}
      className={`relative flex min-w-0 flex-col gap-1 ${className}`}
    >
      {label ? (
        <span
          id={labelId}
          className="text-xs font-medium text-[#D5C3A5]"
        >
          {label}
        </span>
      ) : null}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
        aria-label={label ? undefined : ariaLabel}
        onClick={() => {
          if (isOpen) {
            closeMenu(false);
          } else {
            openMenu(selectedIndex);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className="lkdf-bronze-pill inline-flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6BE6C] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 truncate text-[#F5EBD6]">
          {selectedOption?.label ?? value}
        </span>
        <GameIcon
          name="ui:chevron-down"
          size={14}
          className={`shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#E6BE6C]' : 'text-[#C89B4B]'
          }`}
        />
      </button>

      {isOpen
        ? inDialog
          ? listboxPanel
          : createPortal(listboxPanel, document.body)
        : null}
    </div>
  );
}
