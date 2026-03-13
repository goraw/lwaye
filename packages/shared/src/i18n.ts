import type { Language } from "./types";

export const copy = {
  en: {
    appName: "LwayLway",
    tagline: "Buy and sell safely in Addis Ababa",
    browseListings: "Browse listings",
    chat: "Chat",
    sell: "Sell",
    admin: "Admin",
    favorite: "Favorite",
    report: "Report",
    priceNegotiable: "Negotiable",
    safetyTip: "Meet in a public place and verify the item before paying.",
    verifiedPhone: "Verified phone"
  },
  am: {
    appName: "ልዋይልዋይ",
    tagline: "በአዲስ አበባ በደህና ይግዙ እና ይሽጡ",
    browseListings: "ዝርዝሮችን ይመልከቱ",
    chat: "ውይይት",
    sell: "ይሽጡ",
    admin: "አስተዳደር",
    favorite: "ተወዳጅ",
    report: "ሪፖርት",
    priceNegotiable: "ዋጋ ሊደራደር ይችላል",
    safetyTip: "በሕዝብ ቦታ ይገናኙ እና ከመክፈልዎ በፊት ዕቃውን ያረጋግጡ።",
    verifiedPhone: "የተረጋገጠ ስልክ"
  }
} as const;

export function t(language: Language, key: keyof typeof copy.en): string {
  return copy[language][key];
}
