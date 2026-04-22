import { useRef, useEffect } from "preact/hooks";
import { hpRatio, isLowHp } from "../../rules/combat";

interface Props {
  hpCurrent: number;
  hpMax: number;
  hpTemp: number;
  onAdjust: (delta: number) => void;
}

export function HpBar({ hpCurrent, hpMax, hpTemp, onAdjust }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const prevHp = useRef(hpCurrent);

  useEffect(() => {
    if (!barRef.current) return;
    if (hpCurrent === prevHp.current) return;
    const delta = hpCurrent - prevHp.current;
    const cls = delta < 0 ? "hp__fill--pulse-damage" : "hp__fill--pulse-heal";
    barRef.current.classList.add(cls);
    const t = window.setTimeout(() => barRef.current?.classList.remove(cls), 400);
    prevHp.current = hpCurrent;
    return () => clearTimeout(t);
  }, [hpCurrent]);

  const ratio = hpRatio(hpCurrent, hpMax);
  const lowHp = isLowHp(hpCurrent, hpMax);
  const fillClass = ratio > 0.5 ? "hp__fill--good" : lowHp ? "hp__fill--low" : "";

  return (
    <div class="card hp">
      <div class="hp__row">
        <span class="hp__label">Puntos de Golpe</span>
        <span class="hp__number">
          {hpCurrent} <span class="max">/ {hpMax}</span>
        </span>
      </div>
      <div class="hp__bar" aria-label={`${hpCurrent} de ${hpMax}`}>
        <div ref={barRef} class={`hp__fill ${fillClass}`} style={{ width: `${ratio * 100}%` }} />
        {hpTemp > 0 && <span class="hp__temp">+{hpTemp} temp</span>}
      </div>
      <div class="hp__adjust">
        <button class="minus" onClick={() => onAdjust(-10)}>−10</button>
        <button class="minus" onClick={() => onAdjust(-5)}>−5</button>
        <button class="minus" onClick={() => onAdjust(-1)}>−1</button>
        <button class="plus"  onClick={() => onAdjust(+1)}>+1</button>
        <button class="plus"  onClick={() => onAdjust(+5)}>+5</button>
      </div>
    </div>
  );
}
