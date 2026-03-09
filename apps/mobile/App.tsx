import React, { useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { t } from "@lwaye/shared";
import type {
  Category,
  ChatThread,
  Favorite,
  Language,
  Listing,
  ListingCondition,
  Location,
  Message,
  Profile,
  User
} from "@lwaye/shared";

type Tab = "browse" | "sell" | "chat" | "profile";
type BootstrapPayload = { users: User[]; profiles: Profile[]; categories: Category[]; locations: Location[] };
type ListingsPayload = { items: Listing[]; nextCursor?: string };
type StartOtpPayload = { phone: string; code: string; expiresAt: string };
type VerifyOtpPayload = { user: User; session: { sessionToken: string; expiresAt: string } };
type UploadPayload = { uploadedBy: string; url: string };

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000";
const DEMO_PHONE = "+251912000222";
const DEMO_NAME = "Dawit";
const DEFAULT_CONDITION: ListingCondition = "good";

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
  return payload?.message ?? `Request failed: ${response.status}`;
}

async function apiGet<T>(path: string, sessionToken?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, body?: unknown, sessionToken?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function apiUploadImage(uri: string, sessionToken: string, fileName?: string, mimeType?: string): Promise<UploadPayload> {
  const formData = new FormData();
  formData.append("image", {
    uri,
    name: fileName ?? `listing-${Date.now()}.jpg`,
    type: mimeType ?? "image/jpeg"
  } as never);
  const response = await fetch(`${API_BASE_URL}/v1/uploads/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: formData
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<UploadPayload>;
}

function sellerForListing(listing: Listing | null, users: User[] | undefined): User | null {
  if (!listing || !users) return null;
  return users.find((user) => user.id === listing.sellerId) ?? null;
}

function profileForUser(user: User | null, profiles: Profile[] | undefined): Profile | null {
  if (!user || !profiles) return null;
  return profiles.find((profile) => profile.userId === user.id) ?? null;
}

export default function App() {
  const [language, setLanguage] = useState<Language>("am");
  const [tab, setTab] = useState<Tab>("browse");
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState(DEMO_PHONE);
  const [displayName, setDisplayName] = useState(DEMO_NAME);
  const [otpCode, setOtpCode] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [viewer, setViewer] = useState<User | null>(null);
  const [feed, setFeed] = useState<Listing[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [blockedSellerIds, setBlockedSellerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [listingNegotiable, setListingNegotiable] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [listingCondition, setListingCondition] = useState<ListingCondition>(DEFAULT_CONDITION);
  const [listingPhotoUrl, setListingPhotoUrl] = useState("");
  const [outgoingMessage, setOutgoingMessage] = useState("");

  const viewerProfile = useMemo(() => profileForUser(viewer, bootstrap?.profiles), [bootstrap, viewer]);
  const favoriteIds = useMemo(() => new Set(favorites.map((favorite) => favorite.listingId)), [favorites]);
  const selectedThread = useMemo(() => threads.find((thread) => thread.id === (selectedThreadId ?? threads[0]?.id)) ?? null, [selectedThreadId, threads]);
  const visibleFeed = useMemo(() => feed.filter((listing) => !blockedSellerIds.includes(listing.sellerId)), [blockedSellerIds, feed]);
  const selectedListing = useMemo(() => visibleFeed.find((listing) => listing.id === selectedListingId) ?? null, [selectedListingId, visibleFeed]);
  const selectedSeller = useMemo(() => sellerForListing(selectedListing, bootstrap?.users), [bootstrap, selectedListing]);
  const selectedSellerProfile = useMemo(() => profileForUser(selectedSeller, bootstrap?.profiles), [bootstrap, selectedSeller]);

  useEffect(() => { if (sessionToken) void hydrate(sessionToken); }, [sessionToken]);
  useEffect(() => { if (sessionToken && viewer) void registerPushToken(sessionToken); }, [sessionToken, viewer?.id]);
  useEffect(() => { if (!viewer) { setThreads([]); setFavorites([]); setMessages([]); return; } void loadUserData(viewer.id); }, [viewer?.id]);
  useEffect(() => { if (!selectedThread) { setMessages([]); return; } void loadMessages(selectedThread.id); }, [selectedThread?.id]);
  useEffect(() => {
    if (!bootstrap) return;
    setSelectedCategoryId((current) => current ?? bootstrap.categories[0]?.id ?? null);
    setSelectedLocationId((current) => current ?? bootstrap.locations[0]?.id ?? null);
  }, [bootstrap]);

  async function hydrate(activeSessionToken: string) {
    setIsLoading(true); setErrorMessage(null);
    try {
      const [bootstrapPayload, listingsPayload, mePayload] = await Promise.all([
        apiGet<BootstrapPayload>("/v1/bootstrap", activeSessionToken),
        apiGet<ListingsPayload>("/v1/listings", activeSessionToken),
        apiGet<{ user: User }>("/v1/auth/me", activeSessionToken)
      ]);
      setBootstrap(bootstrapPayload); setFeed(listingsPayload.items); setViewer(mePayload.user); setLanguage(mePayload.user.preferredLanguage); setSelectedListingId((current) => current ?? listingsPayload.items[0]?.id ?? null);
    } catch (error) {
      setSessionToken(null); setViewer(null); setBootstrap(null); setFeed([]); setErrorMessage((error as Error).message);
    } finally { setIsLoading(false); }
  }

  async function loadFeed(nextSearch?: string) {
    setIsRefreshingFeed(true);
    try {
      const query = nextSearch?.trim() ? `?search=${encodeURIComponent(nextSearch.trim())}` : "";
      const payload = await apiGet<ListingsPayload>(`/v1/listings${query}`, sessionToken ?? undefined);
      setFeed(payload.items); setSelectedListingId((current) => current && payload.items.some((listing) => listing.id === current) ? current : payload.items[0]?.id ?? null); setErrorMessage(null);
    } catch (error) { setErrorMessage((error as Error).message); } finally { setIsRefreshingFeed(false); }
  }

  async function loadUserData(userId: string) {
    try {
      const [threadsPayload, favoritesPayload] = await Promise.all([
        apiGet<ChatThread[]>(`/v1/threads/${userId}`, sessionToken ?? undefined),
        apiGet<Favorite[]>(`/v1/favorites/${userId}`, sessionToken ?? undefined)
      ]);
      setThreads(threadsPayload); setFavorites(favoritesPayload); setSelectedThreadId((current) => current && threadsPayload.some((thread) => thread.id === current) ? current : threadsPayload[0]?.id ?? null);
    } catch (error) { setErrorMessage((error as Error).message); }
  }

  async function loadMessages(threadId: string) {
    try { setMessages(await apiGet<Message[]>(`/v1/messages/${threadId}`, sessionToken ?? undefined)); } catch (error) { setErrorMessage((error as Error).message); }
  }

  async function registerPushToken(activeSessionToken: string) {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      let status = permissions.status;
      if (status !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== "granted") {
        return;
      }
      const response = await Notifications.getExpoPushTokenAsync({ projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID });
      if (!response.data || response.data === pushToken) {
        return;
      }
      setPushToken(response.data);
      await apiPost<void>("/v1/push-tokens", { token: response.data, platform: "expo" }, activeSessionToken);
    } catch {
      // keep push registration non-blocking in local/dev environments
    }
  }
  async function handleStartOtp() {
    setIsAuthSubmitting(true);
    try {
      const payload = await apiPost<StartOtpPayload>("/v1/auth/start-otp", { phone });
      setDemoCodeHint(payload.code || null); setOtpCode(payload.code || ""); Alert.alert("Verification code sent", payload.code ? `Demo code: ${payload.code}` : "Check your SMS inbox.");
    } catch (error) { Alert.alert("OTP failed", (error as Error).message); } finally { setIsAuthSubmitting(false); }
  }

  async function handleVerifyOtp() {
    setIsAuthSubmitting(true);
    try {
      const payload = await apiPost<VerifyOtpPayload>("/v1/auth/verify-otp", { phone, code: otpCode, preferredLanguage: language, displayName });
      setViewer(payload.user); setSessionToken(payload.session.sessionToken); setDemoCodeHint(null); setErrorMessage(null);
    } catch (error) { Alert.alert("Sign in failed", (error as Error).message); } finally { setIsAuthSubmitting(false); }
  }

  async function handleLogout() {
    try {
      if (sessionToken && pushToken) await apiPost<void>("/v1/push-tokens/remove", { token: pushToken }, sessionToken);
      if (sessionToken) await apiPost<void>("/v1/auth/logout", undefined, sessionToken);
    } catch {}
    setSessionToken(null); setViewer(null); setBootstrap(null); setFeed([]); setThreads([]); setMessages([]); setFavorites([]); setSelectedThreadId(null); setSelectedListingId(null); setBlockedSellerIds([]); setDemoCodeHint(null); setPushToken(null); setSearch(""); setOtpCode(""); setListingPhotoUrl("");
  }

  async function handleFavoriteToggle(listingId: string) {
    if (!viewer) return;
    setIsUpdatingFavorite(listingId);
    try { setFavorites(await apiPost<Favorite[]>(`/v1/favorites/${viewer.id}/${listingId}`, undefined, sessionToken ?? undefined)); } catch (error) { Alert.alert("Favorite failed", (error as Error).message); } finally { setIsUpdatingFavorite(null); }
  }

  async function handleStartThread(listing: Listing) {
    if (!viewer) return;
    try {
      const thread = await apiPost<ChatThread>("/v1/threads", { listingId: listing.id, buyerId: viewer.id }, sessionToken ?? undefined);
      setTab("chat"); setSelectedThreadId(thread.id); await loadUserData(viewer.id);
    } catch (error) { Alert.alert("Chat unavailable", (error as Error).message); }
  }

  async function handleReport(targetType: "listing" | "user", targetId: string, reasonCode: string) {
    if (!viewer) return;
    setIsReporting(true);
    try {
      await apiPost("/v1/reports", { targetType, targetId, reporterId: viewer.id, reasonCode }, sessionToken ?? undefined);
      Alert.alert("Report sent", targetType === "listing" ? "The listing was reported to the moderation team." : "The seller was reported to the moderation team.");
    } catch (error) { Alert.alert("Report failed", (error as Error).message); } finally { setIsReporting(false); }
  }

  function handleBlockSeller(sellerId: string) {
    const nextBlocked = blockedSellerIds.includes(sellerId) ? blockedSellerIds : [...blockedSellerIds, sellerId];
    setBlockedSellerIds(nextBlocked);
    const remaining = feed.filter((listing) => !nextBlocked.includes(listing.sellerId));
    setSelectedListingId((current) => remaining.find((listing) => listing.id === current)?.id ?? remaining[0]?.id ?? null);
    Alert.alert("Seller hidden", "Listings from this seller are hidden on this device for now.");
  }

  async function handlePickImage() {
    if (!sessionToken) { Alert.alert("Sign in required", "Sign in before uploading a listing image."); return; }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Permission required", "Photo library access is needed to choose a listing image."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setIsUploadingImage(true);
    try {
      const payload = await apiUploadImage(asset.uri, sessionToken, asset.fileName ?? undefined, asset.mimeType ?? undefined);
      setListingPhotoUrl(payload.url);
    } catch (error) { Alert.alert("Upload failed", (error as Error).message); } finally { setIsUploadingImage(false); }
  }

  async function handleCreateListing() {
    if (!viewer || !selectedCategoryId || !selectedLocationId) return;
    const priceValue = Number(listingPrice);
    if (!listingTitle.trim() || !listingDescription.trim() || !Number.isFinite(priceValue) || priceValue <= 0) { Alert.alert("Missing fields", "Enter title, description, and a valid ETB price."); return; }
    setIsCreatingListing(true);
    try {
      const created = await apiPost<Listing>("/v1/listings", { sellerId: viewer.id, title: listingTitle.trim(), description: listingDescription.trim(), priceETB: priceValue, negotiable: listingNegotiable, categoryId: selectedCategoryId, condition: listingCondition, locationId: selectedLocationId, photoUrls: listingPhotoUrl ? [listingPhotoUrl] : [] }, sessionToken ?? undefined);
      setListingTitle(""); setListingDescription(""); setListingPrice(""); setListingNegotiable(true); setListingCondition(DEFAULT_CONDITION); setListingPhotoUrl(""); setSelectedListingId(created.id); setTab("browse"); await loadFeed(); Alert.alert("Listing created", "Your listing is now live in the feed.");
    } catch (error) { Alert.alert("Listing failed", (error as Error).message); } finally { setIsCreatingListing(false); }
  }

  async function handleSendMessage() {
    if (!viewer || !selectedThread || !outgoingMessage.trim()) return;
    setIsSendingMessage(true);
    try {
      const message = await apiPost<Message>("/v1/messages", { threadId: selectedThread.id, senderId: viewer.id, text: outgoingMessage.trim() }, sessionToken ?? undefined);
      setMessages((current) => [...current, message]); setOutgoingMessage(""); await loadUserData(viewer.id);
    } catch (error) { Alert.alert("Message failed", (error as Error).message); } finally { setIsSendingMessage(false); }
  }

  if (!sessionToken || !viewer) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.header}><View><Text style={styles.brand}>{t(language, "appName")}</Text><Text style={styles.tagline}>{t(language, "tagline")}</Text><Text style={styles.apiHint}>{API_BASE_URL}</Text></View><TouchableOpacity style={styles.languageToggle} onPress={() => setLanguage((current) => current === "am" ? "en" : "am")}><Text style={styles.languageToggleText}>{language.toUpperCase()}</Text></TouchableOpacity></View><View style={styles.authWrapper}><View style={styles.authCard}><Text style={styles.panelTitle}>Sign in with phone</Text><Text style={styles.panelBody}>Request a code first. In local demo mode the OTP will be shown here.</Text><TextInput value={phone} onChangeText={setPhone} style={styles.searchInput} placeholder="+2519..." autoCapitalize="none" /><TextInput value={displayName} onChangeText={setDisplayName} style={styles.searchInput} placeholder="Display name" /><TextInput value={otpCode} onChangeText={setOtpCode} style={styles.searchInput} placeholder="OTP code" keyboardType="number-pad" />{demoCodeHint ? <Text style={styles.demoHint}>Demo OTP: {demoCodeHint}</Text> : null}{errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}<View style={styles.inlineActions}><TouchableOpacity style={styles.inlineButton} onPress={() => void handleStartOtp()} disabled={isAuthSubmitting}><Text style={styles.inlineButtonText}>{isAuthSubmitting ? "..." : "Send code"}</Text></TouchableOpacity><TouchableOpacity style={styles.inlineButtonSecondary} onPress={() => void handleVerifyOtp()} disabled={isAuthSubmitting}><Text style={styles.inlineButtonSecondaryText}>Sign in</Text></TouchableOpacity></View></View></View></SafeAreaView>;
  }

  if (isLoading) return <SafeAreaView style={[styles.safeArea, styles.centered]}><ActivityIndicator size="large" color="#1f4d3b" /><Text style={styles.loadingText}>Connecting to Lwaye API...</Text></SafeAreaView>;

  return <SafeAreaView style={styles.safeArea}><View style={styles.header}><View><Text style={styles.brand}>{t(language, "appName")}</Text><Text style={styles.tagline}>{t(language, "tagline")}</Text><Text style={styles.apiHint}>{API_BASE_URL}</Text></View><TouchableOpacity style={styles.languageToggle} onPress={() => setLanguage((current) => current === "am" ? "en" : "am")}><Text style={styles.languageToggleText}>{language.toUpperCase()}</Text></TouchableOpacity></View><View style={styles.tabRow}>{(["browse", "sell", "chat", "profile"] as Tab[]).map((item) => <TouchableOpacity key={item} style={[styles.tabButton, tab === item && styles.tabButtonActive]} onPress={() => setTab(item)}><Text style={[styles.tabLabel, tab === item && styles.tabLabelActive]}>{item}</Text></TouchableOpacity>)}</View><ScrollView contentContainerStyle={styles.content}>{errorMessage ? <View style={styles.errorBanner}><Text style={styles.errorText}>{errorMessage}</Text><TouchableOpacity style={styles.retryButton} onPress={() => void hydrate(sessionToken)}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity></View> : null}{tab === "browse" ? <><TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => void loadFeed(search)} placeholder="Search listings" style={styles.searchInput} /><View style={styles.inlineActions}><TouchableOpacity style={styles.inlineButton} onPress={() => void loadFeed(search)}><Text style={styles.inlineButtonText}>{isRefreshingFeed ? "Loading..." : "Search"}</Text></TouchableOpacity><TouchableOpacity style={styles.inlineButtonSecondary} onPress={() => { setSearch(""); void loadFeed(); }}><Text style={styles.inlineButtonSecondaryText}>Reset</Text></TouchableOpacity></View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>{(bootstrap?.categories ?? []).map((category) => <View key={category.id} style={styles.pill}><Text style={styles.pillText}>{category.label[language]}</Text></View>)}</ScrollView>{selectedListing ? <View style={styles.detailCard}>{selectedListing.photoUrls[0] ? <Image source={{ uri: selectedListing.photoUrls[0] }} style={styles.heroImage} /> : null}<Text style={styles.panelTitle}>{selectedListing.title}</Text><Text style={styles.cardMeta}>ETB {selectedListing.priceETB.toLocaleString()}</Text><Text style={styles.panelBody}>{selectedListing.description}</Text>{selectedListing.negotiable ? <Text style={styles.negotiable}>{t(language, "priceNegotiable")}</Text> : null}<View style={styles.outlineBox}><Text style={styles.outlineText}>Seller: {selectedSeller?.displayName ?? "Unknown seller"}</Text><Text style={styles.outlineText}>Profile: {selectedSeller?.profileType ?? "consumer"}</Text><Text style={styles.outlineText}>Bio: {selectedSellerProfile?.bio ?? "No seller bio yet"}</Text>{selectedSellerProfile?.businessName ? <Text style={styles.outlineText}>Business: {selectedSellerProfile.businessName}</Text> : null}</View><View style={styles.inlineActions}><TouchableOpacity style={styles.primaryButton} onPress={() => void handleStartThread(selectedListing)}><Text style={styles.primaryButtonText}>{t(language, "chat")}</Text></TouchableOpacity><TouchableOpacity style={styles.secondaryButton} onPress={() => void handleFavoriteToggle(selectedListing.id)} disabled={isUpdatingFavorite === selectedListing.id}><Text style={styles.secondaryButtonText}>{favoriteIds.has(selectedListing.id) ? "Saved" : t(language, "favorite")}</Text></TouchableOpacity></View><View style={styles.inlineActions}><TouchableOpacity style={styles.inlineButtonSecondary} onPress={() => void handleReport("listing", selectedListing.id, "listing_suspicious")} disabled={isReporting}><Text style={styles.inlineButtonSecondaryText}>{isReporting ? "..." : "Report listing"}</Text></TouchableOpacity>{selectedSeller ? <TouchableOpacity style={styles.inlineButtonSecondary} onPress={() => void handleReport("user", selectedSeller.id, "seller_abuse")} disabled={isReporting}><Text style={styles.inlineButtonSecondaryText}>Report seller</Text></TouchableOpacity> : null}{selectedSeller ? <TouchableOpacity style={styles.inlineButtonSecondary} onPress={() => handleBlockSeller(selectedSeller.id)}><Text style={styles.inlineButtonSecondaryText}>Hide seller</Text></TouchableOpacity> : null}</View><Text style={styles.safetyText}>{t(language, "safetyTip")}</Text></View> : null}{visibleFeed.length === 0 ? <View style={styles.panel}><Text style={styles.panelTitle}>No listings found</Text><Text style={styles.panelBody}>Adjust your search or confirm the API is running.</Text></View> : null}{visibleFeed.map((listing) => { const location = bootstrap?.locations.find((entry) => entry.id === listing.locationId); const isFavorited = favoriteIds.has(listing.id); return <TouchableOpacity key={listing.id} style={[styles.card, selectedListing?.id === listing.id && styles.cardSelected]} onPress={() => setSelectedListingId(listing.id)}>{listing.photoUrls[0] ? <Image source={{ uri: listing.photoUrls[0] }} style={styles.cardImage} /> : null}<Text style={styles.cardTitle}>{listing.title}</Text><Text style={styles.cardMeta}>ETB {listing.priceETB.toLocaleString()} · {location?.areaLabel[language] ?? location?.subcity ?? "Addis Ababa"}</Text><Text style={styles.cardDescription}>{listing.description}</Text>{listing.negotiable ? <Text style={styles.negotiable}>{t(language, "priceNegotiable")}</Text> : null}<View style={styles.actionRow}><TouchableOpacity style={styles.primaryButton} onPress={() => void handleStartThread(listing)}><Text style={styles.primaryButtonText}>{t(language, "chat")}</Text></TouchableOpacity><TouchableOpacity style={styles.secondaryButton} onPress={() => void handleFavoriteToggle(listing.id)} disabled={isUpdatingFavorite === listing.id}><Text style={styles.secondaryButtonText}>{isUpdatingFavorite === listing.id ? "..." : isFavorited ? "Saved" : t(language, "favorite")}</Text></TouchableOpacity></View></TouchableOpacity>; })}</> : null}{tab === "sell" ? <View style={styles.panel}><Text style={styles.panelTitle}>Create a listing</Text><TextInput value={listingTitle} onChangeText={setListingTitle} style={styles.searchInput} placeholder="Title" /><TextInput value={listingDescription} onChangeText={setListingDescription} style={[styles.searchInput, styles.multilineInput]} placeholder="Description" multiline /><TextInput value={listingPrice} onChangeText={setListingPrice} style={styles.searchInput} placeholder="Price ETB" keyboardType="number-pad" /><TouchableOpacity style={styles.inlineButtonSecondary} onPress={() => void handlePickImage()} disabled={isUploadingImage}><Text style={styles.inlineButtonSecondaryText}>{isUploadingImage ? "Uploading..." : "Pick photo"}</Text></TouchableOpacity>{listingPhotoUrl ? <View style={styles.imagePreviewCard}><Image source={{ uri: listingPhotoUrl }} style={styles.previewImage} /><TouchableOpacity style={styles.inlineButtonSecondary} onPress={() => setListingPhotoUrl("")}><Text style={styles.inlineButtonSecondaryText}>Remove photo</Text></TouchableOpacity></View> : null}<Text style={styles.sectionLabel}>Category</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>{(bootstrap?.categories ?? []).map((category) => <TouchableOpacity key={category.id} style={[styles.pill, selectedCategoryId === category.id && styles.pillActive]} onPress={() => setSelectedCategoryId(category.id)}><Text style={[styles.pillText, selectedCategoryId === category.id && styles.pillTextActive]}>{category.label[language]}</Text></TouchableOpacity>)}</ScrollView><Text style={styles.sectionLabel}>Location</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>{(bootstrap?.locations ?? []).map((location) => <TouchableOpacity key={location.id} style={[styles.pill, selectedLocationId === location.id && styles.pillActive]} onPress={() => setSelectedLocationId(location.id)}><Text style={[styles.pillText, selectedLocationId === location.id && styles.pillTextActive]}>{location.areaLabel[language]}</Text></TouchableOpacity>)}</ScrollView><Text style={styles.sectionLabel}>Condition</Text><View style={styles.inlineActions}>{(["new", "like_new", "good", "fair", "used"] as ListingCondition[]).map((condition) => <TouchableOpacity key={condition} style={[styles.inlineButtonSecondary, listingCondition === condition && styles.inlineButtonActive]} onPress={() => setListingCondition(condition)}><Text style={[styles.inlineButtonSecondaryText, listingCondition === condition && styles.inlineButtonActiveText]}>{condition}</Text></TouchableOpacity>)}</View><TouchableOpacity style={listingNegotiable ? styles.inlineButton : styles.inlineButtonSecondary} onPress={() => setListingNegotiable((current) => !current)}><Text style={listingNegotiable ? styles.inlineButtonText : styles.inlineButtonSecondaryText}>{listingNegotiable ? "Negotiable" : "Fixed price"}</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={() => void handleCreateListing()} disabled={isCreatingListing}><Text style={styles.primaryButtonText}>{isCreatingListing ? "Publishing..." : "Publish listing"}</Text></TouchableOpacity></View> : null}
{tab === "chat" ? <View style={styles.panel}><Text style={styles.panelTitle}>{t(language, "chat")}</Text>{threads.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>{threads.map((thread) => <TouchableOpacity key={thread.id} style={[styles.pill, selectedThread?.id === thread.id && styles.pillActive]} onPress={() => setSelectedThreadId(thread.id)}><Text style={[styles.pillText, selectedThread?.id === thread.id && styles.pillTextActive]}>{feed.find((listing) => listing.id === thread.listingId)?.title ?? thread.id}</Text></TouchableOpacity>)}</ScrollView> : null}{selectedThread ? <Text style={styles.threadContext}>Listing: {feed.find((listing) => listing.id === selectedThread.listingId)?.title ?? selectedThread.id}</Text> : null}{messages.length === 0 ? <Text style={styles.panelBody}>No messages yet for this thread.</Text> : null}{messages.map((message) => { const isMine = message.senderId === viewer.id; return <View key={message.id} style={isMine ? styles.chatBubbleMine : styles.chatBubbleTheirs}><Text style={[styles.chatText, isMine && styles.chatTextMine]}>{message.text}</Text></View>; })}{selectedThread ? <><TextInput value={outgoingMessage} onChangeText={setOutgoingMessage} style={[styles.searchInput, styles.messageComposer]} placeholder="Write a message" /><TouchableOpacity style={styles.primaryButton} onPress={() => void handleSendMessage()} disabled={isSendingMessage}><Text style={styles.primaryButtonText}>{isSendingMessage ? "Sending..." : "Send"}</Text></TouchableOpacity></> : null}<Text style={styles.safetyText}>{t(language, "safetyTip")}</Text></View> : null}{tab === "profile" ? <View style={styles.panel}><Text style={styles.panelTitle}>{viewer.displayName}</Text><Text style={styles.panelBody}>{t(language, "verifiedPhone")}</Text><Text style={styles.panelBody}>Preferred language: {viewer.preferredLanguage.toUpperCase()}</Text><Text style={styles.panelBody}>Profile: {viewerProfile?.bio ?? "No bio yet"}</Text><Text style={styles.panelBody}>Saved listings: {favorites.length}</Text><Text style={styles.panelBody}>Hidden sellers: {blockedSellerIds.length}</Text><Text style={styles.panelBody}>{viewer.phone}</Text><TouchableOpacity style={styles.retryButton} onPress={() => void handleLogout()}><Text style={styles.retryButtonText}>Log out</Text></TouchableOpacity></View> : null}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: "#f6f0e8" }, authWrapper: { flex: 1, justifyContent: "center", padding: 20 }, authCard: { backgroundColor: "#fff7eb", borderRadius: 24, padding: 24, gap: 14, borderWidth: 1, borderColor: "#e4d3bc" }, demoHint: { color: "#345548", fontWeight: "700" }, centered: { justifyContent: "center", alignItems: "center", gap: 12 }, loadingText: { color: "#345548", fontWeight: "600" }, header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: "#1f4d3b", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, brand: { color: "#fff7eb", fontSize: 28, fontWeight: "800" }, tagline: { color: "#dce9de", fontSize: 13, marginTop: 4 }, apiHint: { color: "#c4d3c7", fontSize: 11, marginTop: 6 }, languageToggle: { backgroundColor: "#e6b54a", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }, languageToggleText: { color: "#24352c", fontWeight: "700" }, tabRow: { flexDirection: "row", padding: 12, gap: 8, backgroundColor: "#fff7eb" }, tabButton: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: "#ede1cf" }, tabButtonActive: { backgroundColor: "#1f4d3b" }, tabLabel: { textAlign: "center", color: "#5a4d42", fontWeight: "600", textTransform: "capitalize" }, tabLabelActive: { color: "#fff7eb" }, content: { padding: 16, gap: 16 }, errorBanner: { backgroundColor: "#fff1f2", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#f4b8c0", gap: 12 }, errorText: { color: "#8a2432", lineHeight: 20 }, retryButton: { alignSelf: "flex-start", backgroundColor: "#8a2432", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }, retryButtonText: { color: "#fff7eb", fontWeight: "700" }, searchInput: { backgroundColor: "#ffffff", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#dfd1bc" }, multilineInput: { minHeight: 100, textAlignVertical: "top" }, messageComposer: { marginTop: 8 }, inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }, inlineButton: { backgroundColor: "#1f4d3b", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }, inlineButtonText: { color: "#fff7eb", fontWeight: "700" }, inlineButtonSecondary: { backgroundColor: "#ede1cf", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }, inlineButtonSecondaryText: { color: "#5c4a38", fontWeight: "700" }, inlineButtonActive: { backgroundColor: "#1f4d3b" }, inlineButtonActiveText: { color: "#fff7eb" }, categoryRow: { marginTop: 12, marginBottom: 8 }, sectionLabel: { color: "#345548", fontWeight: "700", marginTop: 8 }, pill: { backgroundColor: "#fff7eb", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, borderWidth: 1, borderColor: "#d6c4a8" }, pillActive: { backgroundColor: "#1f4d3b", borderColor: "#1f4d3b" }, pillText: { color: "#5f4934", fontWeight: "600" }, pillTextActive: { color: "#fff7eb" }, panel: { backgroundColor: "#fff7eb", borderRadius: 20, padding: 20, gap: 12, borderWidth: 1, borderColor: "#e4d3bc" }, panelTitle: { fontSize: 22, fontWeight: "800", color: "#21372d" }, panelBody: { color: "#4d4137", lineHeight: 22 }, detailCard: { backgroundColor: "#fffdf8", borderRadius: 22, padding: 18, borderWidth: 1, borderColor: "#dcc8ad", gap: 10 }, heroImage: { width: "100%", height: 220, borderRadius: 18, backgroundColor: "#ede1cf" }, card: { backgroundColor: "#ffffff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#eadfcf", gap: 8 }, cardSelected: { borderColor: "#1f4d3b", borderWidth: 2 }, cardImage: { width: "100%", height: 180, borderRadius: 16, backgroundColor: "#ede1cf" }, previewImage: { width: "100%", height: 220, borderRadius: 16, backgroundColor: "#ede1cf" }, imagePreviewCard: { gap: 10 }, cardTitle: { fontSize: 18, fontWeight: "800", color: "#1d2e27" }, cardMeta: { color: "#345548", fontWeight: "700" }, cardDescription: { color: "#52463d", lineHeight: 20 }, negotiable: { color: "#a15d00", fontWeight: "700" }, actionRow: { flexDirection: "row", gap: 10, marginTop: 8 }, primaryButton: { flex: 1, backgroundColor: "#1f4d3b", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 }, primaryButtonText: { textAlign: "center", color: "#fff7eb", fontWeight: "700" }, secondaryButton: { flex: 1, backgroundColor: "#ede1cf", borderRadius: 12, paddingVertical: 12 }, secondaryButtonText: { textAlign: "center", color: "#5c4a38", fontWeight: "700" }, outlineBox: { borderWidth: 1, borderColor: "#d3c0a5", borderRadius: 16, padding: 14, gap: 8 }, outlineText: { color: "#4f4338" }, threadContext: { color: "#345548", fontWeight: "700", marginBottom: 6 }, chatBubbleMine: { alignSelf: "flex-end", backgroundColor: "#1f4d3b", padding: 12, borderRadius: 14, maxWidth: "85%" }, chatBubbleTheirs: { alignSelf: "flex-start", backgroundColor: "#ede1cf", padding: 12, borderRadius: 14, maxWidth: "85%" }, chatText: { color: "#4d4137" }, chatTextMine: { color: "#fff7eb" }, safetyText: { color: "#915300", lineHeight: 22, fontWeight: "600" } });

