import type { Quest } from "./quests";

const FWC_QUESTLINES = new Set([
  "1st job change",
  "2nd Job Change",
  "3rd Job Change",
  "The Clockworks War",
  "Azria",
  "Volkane Dungeon",
  "Storm Peak",
  "Coral Island",
  "The Wilds",
  "Herneos",
  "The Kaillun Expedition",
]);

const FWC_SPECIFIC_OFFICE_QUESTS = new Set([
  "Anesthetic Needs",
  "Mushroom Farm of Chitller",
  "The Best Shield",
  "Strange Collector (6)",
  "Evil Eyed Red Dragon",
  "Request of Lurif",
  "Prehistoric Birds (2)",
]);

const FWC_OFFICE_LEVEL_THRESHOLD = 115;

export function getRecommendationTextColor(cat: string): string {
  switch (cat) {
    case "Mandatory":
      return "text-red-400";
    case "Prioritize":
      return "text-green-400";
    case "On the go":
      return "text-blue-400";
    case "Wait":
      return "text-yellow-400";
    case "Skip":
      return "text-zinc-400";
    case "Special":
      return "text-purple-400";
    default:
      return "text-muted-foreground";
  }
}

export function getRecommendationBadgeColor(rec: string): string {
  const r = rec.toLowerCase();
  if (r.includes("mandatory"))
    return "bg-red-500/20 text-red-400 border-red-500/30";
  if (r.includes("prioritize"))
    return "bg-green-500/20 text-green-400 border-green-500/30";
  if (r.includes("on the go"))
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (r.includes("skip"))
    return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  if (r.includes("wait"))
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (r.includes("special"))
    return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
}

export function isQuestInFWCFilter(quest: Quest): boolean {
  if (quest.questline === "Hero") return false;
  if (FWC_QUESTLINES.has(quest.questline)) return true;
  if (quest.questline === "Office") {
    if (quest.level >= FWC_OFFICE_LEVEL_THRESHOLD) return true;
    if (FWC_SPECIFIC_OFFICE_QUESTS.has(quest.name)) return true;
  }
  return false;
}
