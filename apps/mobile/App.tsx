import React, { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { categories, listings, locations, profiles, t, users } from "@lwaye/shared";
import type { Language } from "@lwaye/shared";

type Tab = "browse" | "sell" | "chat" | "profile";

const seller = users[0];
const buyer = users[1];

export default function App() {
  const [language, setLanguage] = useState<Language>("am");
  const [tab, setTab] = useState<Tab>("browse");
  const [search, setSearch] = useState("");

  const visibleListings = useMemo(() => {
    return listings.filter((listing) => {
      const q = search.trim().toLowerCase();
      if (!q) {
        return true;
      }
      return `${listing.title} ${listing.description}`.toLowerCase().includes(q);
    });
  }, [search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>{t(language, "appName")}</Text>
          <Text style={styles.tagline}>{t(language, "tagline")}</Text>
        </View>
        <TouchableOpacity
          style={styles.languageToggle}
          onPress={() => setLanguage((current) => (current === "am" ? "en" : "am"))}
        >
          <Text style={styles.languageToggleText}>{language.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(["browse", "sell", "chat", "profile"] as Tab[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.tabButton, tab === item && styles.tabButtonActive]}
            onPress={() => setTab(item)}
          >
            <Text style={[styles.tabLabel, tab === item && styles.tabLabelActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === "browse" && (
          <>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={language === "am" ? "?? ????" : "Search listings"}
              style={styles.searchInput}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {categories.map((category) => (
                <View key={category.id} style={styles.pill}>
                  <Text style={styles.pillText}>{category.label[language]}</Text>
                </View>
              ))}
            </ScrollView>

            {visibleListings.map((listing) => {
              const location = locations.find((entry) => entry.id === listing.locationId);
              return (
                <View key={listing.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{listing.title}</Text>
                  <Text style={styles.cardMeta}>
                    ETB {listing.priceETB.toLocaleString()} • {location?.areaLabel[language]}
                  </Text>
                  <Text style={styles.cardDescription}>{listing.description}</Text>
                  {listing.negotiable && <Text style={styles.negotiable}>{t(language, "priceNegotiable")}</Text>}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.primaryButton}>
                      <Text style={styles.primaryButtonText}>{t(language, "chat")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>{t(language, "favorite")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {tab === "sell" && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{language === "am" ? "??? ????" : "Create a listing"}</Text>
            <Text style={styles.panelBody}>
              {language === "am"
                ? "????? ???? ????? ??? ??? ?? ???? ????? ?????"
                : "Add photos, title, description, price, condition, and location in one quick flow."}
            </Text>
            <View style={styles.outlineBox}>
              <Text style={styles.outlineText}>Seller: {seller.displayName}</Text>
              <Text style={styles.outlineText}>Launch city: Addis Ababa</Text>
              <Text style={styles.outlineText}>Categories: {categories.length}</Text>
            </View>
          </View>
        )}

        {tab === "chat" && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{t(language, "chat")}</Text>
            <View style={styles.chatBubbleMine}>
              <Text style={styles.chatText}>
                {language === "am" ? "?? ?? ???? ???" : "Is this item still available?"}
              </Text>
            </View>
            <View style={styles.chatBubbleTheirs}>
              <Text style={styles.chatText}>
                {language === "am" ? "??? ?? ?? ????? ???????" : "Yes, we can meet in Bole."}
              </Text>
            </View>
            <Text style={styles.safetyText}>{t(language, "safetyTip")}</Text>
          </View>
        )}

        {tab === "profile" && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{buyer.displayName}</Text>
            <Text style={styles.panelBody}>{t(language, "verifiedPhone")}</Text>
            <Text style={styles.panelBody}>
              {language === "am" ? "????? ???" : "Preferred language"}: {buyer.preferredLanguage.toUpperCase()}
            </Text>
            <Text style={styles.panelBody}>
              {language === "am" ? "????" : "Profile"}: {profiles[1].bio}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f0e8"
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#1f4d3b",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  brand: {
    color: "#fff7eb",
    fontSize: 28,
    fontWeight: "800"
  },
  tagline: {
    color: "#dce9de",
    fontSize: 13,
    marginTop: 4
  },
  languageToggle: {
    backgroundColor: "#e6b54a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  languageToggleText: {
    color: "#24352c",
    fontWeight: "700"
  },
  tabRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: "#fff7eb"
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#ede1cf"
  },
  tabButtonActive: {
    backgroundColor: "#1f4d3b"
  },
  tabLabel: {
    textAlign: "center",
    color: "#5a4d42",
    fontWeight: "600",
    textTransform: "capitalize"
  },
  tabLabelActive: {
    color: "#fff7eb"
  },
  content: {
    padding: 16,
    gap: 16
  },
  searchInput: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#dfd1bc"
  },
  categoryRow: {
    marginTop: 12,
    marginBottom: 8
  },
  pill: {
    backgroundColor: "#fff7eb",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#d6c4a8"
  },
  pillText: {
    color: "#5f4934",
    fontWeight: "600"
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eadfcf",
    gap: 8
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1d2e27"
  },
  cardMeta: {
    color: "#345548",
    fontWeight: "700"
  },
  cardDescription: {
    color: "#52463d",
    lineHeight: 20
  },
  negotiable: {
    color: "#a15d00",
    fontWeight: "700"
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#1f4d3b",
    borderRadius: 12,
    paddingVertical: 12
  },
  primaryButtonText: {
    textAlign: "center",
    color: "#fff7eb",
    fontWeight: "700"
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#ede1cf",
    borderRadius: 12,
    paddingVertical: 12
  },
  secondaryButtonText: {
    textAlign: "center",
    color: "#5c4a38",
    fontWeight: "700"
  },
  panel: {
    backgroundColor: "#fff7eb",
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e4d3bc"
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#21372d"
  },
  panelBody: {
    color: "#4d4137",
    lineHeight: 22
  },
  outlineBox: {
    borderWidth: 1,
    borderColor: "#d3c0a5",
    borderRadius: 16,
    padding: 14,
    gap: 8
  },
  outlineText: {
    color: "#4f4338"
  },
  chatBubbleMine: {
    alignSelf: "flex-start",
    backgroundColor: "#ede1cf",
    padding: 12,
    borderRadius: 14,
    maxWidth: "85%"
  },
  chatBubbleTheirs: {
    alignSelf: "flex-end",
    backgroundColor: "#1f4d3b",
    padding: 12,
    borderRadius: 14,
    maxWidth: "85%"
  },
  chatText: {
    color: "#fff7eb"
  },
  safetyText: {
    color: "#915300",
    lineHeight: 22,
    fontWeight: "600"
  }
});
