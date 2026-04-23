import type { JSX } from "preact";

export type IconName =
  | "add"
  | "bag"
  | "book"
  | "buy"
  | "cancel"
  | "damage"
  | "d20"
  | "edit"
  | "equip"
  | "export"
  | "import"
  | "journal"
  | "magic"
  | "open"
  | "prepare"
  | "rest"
  | "save"
  | "shield"
  | "shop"
  | "sword"
  | "lock"
  | "unlock"
  | "trash"
  | "userAdd";

interface Props {
  name: IconName;
  class?: string;
}

const paths: Record<IconName, JSX.Element> = {
  add: <path d="M12 5v14M5 12h14" />,
  bag: <path d="M7 9h10l1 11H6L7 9Zm2 0a3 3 0 0 1 6 0" />,
  book: <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3-3V4Zm0 13a3 3 0 0 1 3-3h10" />,
  buy: <path d="M6 7h15l-2 8H8L6 7Zm0 0L5 4H2M9 20h.01M18 20h.01" />,
  cancel: <path d="M7 7l10 10M17 7 7 17" />,
  damage: <path d="m13 2-2 8 6-1-8 13 2-9-6 1 8-12Z" />,
  d20: <path d="m12 2 9 6-3 11H6L3 8l9-6Zm0 0v20M3 8l9 5 9-5M6 19l6-6 6 6" />,
  edit: <path d="m4 16-.5 4 4-.5L19 8l-3-3L4 16Zm10-9 3 3" />,
  equip: <path d="m4 12 5 5L20 6" />,
  export: <path d="M12 15V3m0 0 4 4m-4-4L8 7M5 12v7h14v-7" />,
  import: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 12v7h14v-7" />,
  journal: <path d="M6 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1Zm2 4h8M8 12h7" />,
  magic: <path d="m5 19 9-9m-2-2 4 4M14 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM5 4l.5 1.5L7 6l-1.5.5L5 8l-.5-1.5L3 6l1.5-.5L5 4Z" />,
  open: <path d="M4 12h14m0 0-4-4m4 4-4 4M4 5v14" />,
  prepare: <path d="M3 10c3-2 6-2 9 0v11c-3-2-6-2-9 0V10Zm18 0c-3-2-6-2-9 0v11c3-2 6-2 9 0V10ZM12 2v5m-2-2 2 2 2-2" />,
  rest: <path d="M18 15.5A7 7 0 0 1 8.5 6a8 8 0 1 0 9.5 9.5Z" />,
  save: <path d="M5 4h12l2 2v14H5V4Zm3 0v6h8V4M8 20v-6h8v6" />,
  shield: <path d="M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3Z" />,
  shop: <path d="M4 10h16l-1-5H5l-1 5Zm1 0v10h14V10M8 20v-6h8v6" />,
  sword: <path d="M14 4h6v6L9 21l-6-6L14 4Zm-4 12-2-2M5 19l4-4" />,
  lock: <path d="M6 10V7a6 6 0 1 1 12 0v3M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm7 4v3" />,
  unlock: <path d="M7 10V7a5 5 0 0 1 9.5-1.5M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm7 4v3" />,
  trash: <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />,
  userAdd: <path d="M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9-5v6m-3-3h6" />,
};

export function Icon({ name, class: className }: Props) {
  return (
    <svg class={`icon ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
