import type { TimelineEntry } from "../rules/types";
import { uid } from "./character";

export function entry(text: string, kind: TimelineEntry["kind"] = "normal"): TimelineEntry {
  return { id: uid(), time: new Date().toISOString(), text, kind };
}
