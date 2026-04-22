// d20 button: compact "seal" style. Press animates scale/rotate + haptic.
import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";
import { haptic } from "../../state/dice";
import { Icon } from "./Icon";

interface Props {
  onClick?: (e: MouseEvent) => void;
  small?: boolean;
  variant?: "d20" | "damage";
  children: ComponentChildren;
  ariaLabel?: string;
}

export function SealButton({ onClick, small, variant = "d20", children, ariaLabel }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  const onDown = () => {
    ref.current?.classList.add("is-pressed");
    haptic("light");
  };
  const onUp = (e: MouseEvent) => {
    ref.current?.classList.remove("is-pressed");
    haptic("medium");
    onClick?.(e);
  };

  const cls = [
    "d20",
    small ? "d20--small" : "",
    variant === "damage" ? "d20--damage" : "",
  ].filter(Boolean).join(" ");

  return (
    <button
      ref={ref}
      class={cls}
      onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={() => ref.current?.classList.remove("is-pressed")}
      onTouchStart={onDown as unknown as (e: TouchEvent) => void}
      onTouchEnd={onUp as unknown as (e: TouchEvent) => void}
      aria-label={ariaLabel}
    >
      <Icon name={variant === "damage" ? "damage" : "d20"} />
      <span>{children}</span>
    </button>
  );
}
