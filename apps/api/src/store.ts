import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  Category,
  ChatThread,
  CreateListingRequest,
  CreateReportRequest,
  Favorite,
  FeedQuery,
  Listing,
  ListingStatus,
  Location,
  Message,
  Profile,
  Report,
  SendMessageRequest,
  StartThreadRequest,
  User,
  VerifyOtpRequest
} from "@lwaye/shared";
import { pool } from "./db";
import { sendVerificationCode } from "./sms";
import { sendPushNotification } from "./notifications";

type UserRow = {
  id: string;
  phone: string;
  verification_status: User["verificationStatus"];
  display_name: string;
  preferred_language: User["preferredLanguage"];
  profile_type: User["profileType"];
  status: User["status"];
  is_phone_verified: boolean;
  is_admin: boolean;
};

type ProfileRow = {
  user_id: string;
  bio: string | null;
  business_name: string | null;
  avatar_url: string | null;
  joined_at: Date | string;
  meetup_guidance_accepted: boolean;
};

type CategoryRow = {
  id: string;
  slug: string;
  label_am: string;
  label_en: string;
};

type LocationRow = {
  id: string;
  city: string;
  subcity: string;
  area_label_am: string;
  area_label_en: string;
};

type ListingRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price_etb: number;
  negotiable: boolean;
  category_id: string;
  condition: Listing["condition"];
  location_id: string;
  status: ListingStatus;
  created_at: Date | string;
  updated_at: Date | string;
  photo_urls: string[] | null;
};

type FavoriteRow = {
  id: string;
  listing_id: string;
  user_id: string;
  created_at: Date | string;
};

type ThreadRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: ChatThread["status"];
  last_message_at: Date | string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  text: string;
  created_at: Date | string;
  read_at: Date | string | null;
};

type DevicePushTokenRow = {
  token: string;
};
type ReportRow = {
  id: string;
  target_type: Report["targetType"];
  target_id: string;
  reporter_id: string;
  reason_code: string;
  notes: string | null;
  status: Report["status"];
  created_at: Date | string;
};

export type AuthSession = {
  sessionToken: string;
  expiresAt: string;
};

export type VerifyOtpResult = {
  user: User;
  session: AuthSession;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    phone: row.phone,
    verificationStatus: row.verification_status,
    displayName: row.display_name,
    preferredLanguage: row.preferred_language,
    profileType: row.profile_type,
    status: row.status,
    isPhoneVerified: row.is_phone_verified,
    isAdmin: row.is_admin
  };
}

function mapProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    bio: row.bio ?? undefined,
    businessName: row.business_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    joinedAt: toIso(row.joined_at),
    meetupGuidanceAccepted: row.meetup_guidance_accepted
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    label: {
      am: row.label_am,
      en: row.label_en
    }
  };
}

function mapLocation(row: LocationRow): Location {
  return {
    id: row.id,
    city: row.city,
    subcity: row.subcity,
    areaLabel: {
      am: row.area_label_am,
      en: row.area_label_en
    }
  };
}

function mapListing(row: ListingRow): Listing {
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    description: row.description,
    priceETB: Number(row.price_etb),
    negotiable: row.negotiable,
    categoryId: row.category_id,
    condition: row.condition,
    locationId: row.location_id,
    photoUrls: row.photo_urls ?? [],
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function mapFavorite(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    listingId: row.listing_id,
    userId: row.user_id,
    createdAt: toIso(row.created_at)
  };
}

function mapThread(row: ThreadRow): ChatThread {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    status: row.status,
    lastMessageAt: toIso(row.last_message_at)
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    text: row.text,
    createdAt: toIso(row.created_at),
    readAt: row.read_at ? toIso(row.read_at) : undefined
  };
}

function mapReport(row: ReportRow): Report {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    reporterId: row.reporter_id,
    reasonCode: row.reason_code,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: toIso(row.created_at)
  };
}

function createId(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function otpMatches(inputCode: string, storedHash: string): boolean {
  const inputHash = hashOtpCode(inputCode);
  return timingSafeEqual(Buffer.from(inputHash, "utf8"), Buffer.from(storedHash, "utf8"));
}

function buildFeedWhere(query: FeedQuery) {
  const conditions = ["l.status = 'active'"];
  const values: Array<string | number> = [];

  if (query.categoryId) {
    values.push(query.categoryId);
    conditions.push(`l.category_id = $${values.length}`);
  }

  if (query.locationId) {
    values.push(query.locationId);
    conditions.push(`l.location_id = $${values.length}`);
  }

  if (query.minPrice !== undefined) {
    values.push(query.minPrice);
    conditions.push(`l.price_etb >= $${values.length}`);
  }

  if (query.maxPrice !== undefined) {
    values.push(query.maxPrice);
    conditions.push(`l.price_etb <= $${values.length}`);
  }

  if (query.search) {
    values.push(query.search.trim());
    conditions.push(`l.search_document @@ websearch_to_tsquery('simple', $${values.length})`);
  }

  return { conditions, values };
}

async function queryListings(whereClause: string, values: Array<string | number>, limitClause = "") {
  const result = await pool.query<ListingRow>(
    `SELECT
       l.id,
       l.seller_id,
       l.title,
       l.description,
       l.price_etb,
       l.negotiable,
       l.category_id,
       l.condition,
       l.location_id,
       l.status,
       l.created_at,
       l.updated_at,
       COALESCE(array_agg(li.image_url ORDER BY li.sort_order) FILTER (WHERE li.image_url IS NOT NULL), '{}') AS photo_urls
     FROM listings l
     LEFT JOIN listing_images li ON li.listing_id = l.id
     ${whereClause}
     GROUP BY l.id
     ORDER BY l.created_at DESC
     ${limitClause}`,
    values
  );

  return result.rows.map(mapListing);
}

async function insertSession(client: { query: typeof pool.query }, userId: string): Promise<AuthSession> {
  const token = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await client.query(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES ($1, $2, $3::timestamptz)`,
    [token, userId, expiresAt]
  );
  return {
    sessionToken: token,
    expiresAt
  };
}

async function insertModerationAction(client: { query: typeof pool.query }, adminId: string, actionType: "approve_listing" | "hide_listing" | "suspend_user" | "resolve_report", targetId: string) {
  await client.query(
    `INSERT INTO moderation_actions (id, admin_id, action_type, target_id)
     VALUES ($1, $2, $3, $4)`,
    [createId("mod"), adminId, actionType, targetId]
  );
}

async function listDevicePushTokens(userId: string) {
  const result = await pool.query<DevicePushTokenRow>(
    `SELECT token FROM device_push_tokens WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId]
  );
  return result.rows.map((row) => row.token);
}

async function notifyUser(userId: string, title: string, body: string, data?: Record<string, string>) {
  const tokens = await listDevicePushTokens(userId);
  await sendPushNotification(tokens.map((token) => ({ token, title, body, data })));
}

export class MarketplaceStore {
  async getAdminDashboard() {
    const [usersResult, categoriesResult, listingsResult, reportsResult] = await Promise.all([
      pool.query<UserRow>(
        `SELECT id, phone, verification_status, display_name, preferred_language, profile_type, status, is_phone_verified, is_admin
         FROM users
         ORDER BY created_at ASC`
      ),
      pool.query<CategoryRow>(
        `SELECT id, slug, label_am, label_en
         FROM categories
         WHERE is_active = TRUE
         ORDER BY label_en ASC`
      ),
      queryListings("", []),
      this.listReports()
    ]);

    return {
      users: usersResult.rows.map(mapUser),
      categories: categoriesResult.rows.map(mapCategory),
      listings: listingsResult,
      reports: reportsResult
    };
  }
  async getBootstrap() {
    const [usersResult, profilesResult, categoriesResult, locationsResult] = await Promise.all([
      pool.query<UserRow>(
        `SELECT id, phone, verification_status, display_name, preferred_language, profile_type, status, is_phone_verified, is_admin
         FROM users
         ORDER BY created_at ASC`
      ),
      pool.query<ProfileRow>(
        `SELECT user_id, bio, business_name, avatar_url, joined_at, meetup_guidance_accepted
         FROM profiles
         ORDER BY joined_at ASC`
      ),
      pool.query<CategoryRow>(
        `SELECT id, slug, label_am, label_en
         FROM categories
         WHERE is_active = TRUE
         ORDER BY label_en ASC`
      ),
      pool.query<LocationRow>(
        `SELECT id, city, subcity, area_label_am, area_label_en
         FROM locations
         WHERE is_active = TRUE
         ORDER BY city ASC, subcity ASC`
      )
    ]);

    return {
      users: usersResult.rows.map(mapUser),
      profiles: profilesResult.rows.map(mapProfile),
      categories: categoriesResult.rows.map(mapCategory),
      locations: locationsResult.rows.map(mapLocation)
    };
  }

  async startOtp(phone: string) {
    const id = createId("otp");
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO phone_verifications (id, phone, code_hash, expires_at)
       VALUES ($1, $2, $3, $4::timestamptz)`,
      [id, phone, hashOtpCode(code), expiresAt]
    );

    const delivery = await sendVerificationCode(phone, code);

    return {
      phone,
      code: delivery.previewCode,
      expiresAt
    };
  }

  async verifyOtp(input: VerifyOtpRequest): Promise<VerifyOtpResult> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const verificationResult = await client.query<{ id: string; code_hash: string; attempt_count: number }>(
        `SELECT id, code_hash, attempt_count
         FROM phone_verifications
         WHERE phone = $1
           AND consumed_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [input.phone]
      );

      if (verificationResult.rowCount === 0 || !verificationResult.rows[0]) {
        throw new Error("Invalid or expired verification code");
      }

      const verification = verificationResult.rows[0];
      if (!otpMatches(input.code, verification.code_hash)) {
        await client.query(
          `UPDATE phone_verifications
           SET attempt_count = attempt_count + 1
           WHERE id = $1`,
          [verification.id]
        );
        throw new Error("Invalid or expired verification code");
      }

      await client.query(
        `UPDATE phone_verifications
         SET consumed_at = NOW()
         WHERE id = $1`,
        [verification.id]
      );

      const existingResult = await client.query<UserRow>(
        `SELECT id, phone, verification_status, display_name, preferred_language, profile_type, status, is_phone_verified, is_admin
         FROM users
         WHERE phone = $1
         LIMIT 1`,
        [input.phone]
      );

      let user: User;
      if (existingResult.rowCount && existingResult.rows[0]) {
        const updatedResult = await client.query<UserRow>(
          `UPDATE users
           SET verification_status = 'verified',
               is_phone_verified = TRUE,
               display_name = $2,
               preferred_language = $3,
               updated_at = NOW()
           WHERE phone = $1
           RETURNING id, phone, verification_status, display_name, preferred_language, profile_type, status, is_phone_verified, is_admin`,
          [input.phone, input.displayName, input.preferredLanguage]
        );
        user = mapUser(updatedResult.rows[0]);
      } else {
        const userId = createId("usr");
        const createdResult = await client.query<UserRow>(
          `INSERT INTO users (id, phone, verification_status, display_name, preferred_language, profile_type, status, is_phone_verified, is_admin)
           VALUES ($1, $2, 'verified', $3, $4, 'consumer', 'active', TRUE, FALSE)
           RETURNING id, phone, verification_status, display_name, preferred_language, profile_type, status, is_phone_verified, is_admin`,
          [userId, input.phone, input.displayName, input.preferredLanguage]
        );

        await client.query(
          `INSERT INTO profiles (user_id, meetup_guidance_accepted)
           VALUES ($1, TRUE)`,
          [userId]
        );

        user = mapUser(createdResult.rows[0]);
      }

      const session = await insertSession(client, user.id);

      await client.query("COMMIT");
      return { user, session };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getSessionUser(token: string) {
    const result = await pool.query<UserRow>(
      `SELECT u.id, u.phone, u.verification_status, u.display_name, u.preferred_language, u.profile_type, u.status, u.is_phone_verified, u.is_admin
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND u.status = 'active'
       LIMIT 1`,
      [token]
    );

    if (!result.rows[0]) {
      return undefined;
    }

    await pool.query(
      `UPDATE sessions
       SET last_used_at = NOW()
       WHERE token = $1`,
      [token]
    );

    return mapUser(result.rows[0]);
  }

  async registerPushToken(userId: string, token: string, platform: string) {
    await pool.query(
      `INSERT INTO device_push_tokens (id, user_id, token, platform)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token)
       DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = NOW(), last_seen_at = NOW()`,
      [createId("dpt"), userId, token, platform]
    );
  }

  async removePushToken(userId: string, token: string) {
    await pool.query(
      `DELETE FROM device_push_tokens
       WHERE user_id = $1 AND token = $2`,
      [userId, token]
    );
  }
  async revokeSession(token: string) {
    await pool.query(
      `UPDATE sessions
       SET revoked_at = NOW()
       WHERE token = $1 AND revoked_at IS NULL`,
      [token]
    );
  }

  async listFeed(query: FeedQuery) {
    const limit = query.limit ?? 20;
    const { conditions, values } = buildFeedWhere(query);
    values.push(limit + 1);
    const items = await queryListings(`WHERE ${conditions.join(" AND ")}`, values, `LIMIT $${values.length}`);

    return {
      items: items.slice(0, limit),
      nextCursor: items.length > limit ? items[limit]?.id : undefined
    };
  }

  async getListing(listingId: string) {
    const items = await queryListings("WHERE l.id = $1", [listingId]);
    return items[0];
  }

  async createListing(input: CreateListingRequest): Promise<Listing> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const listingId = createId("lst");
      const listingResult = await client.query<ListingRow>(
        `INSERT INTO listings (
           id, seller_id, title, description, price_etb, negotiable, category_id, condition, location_id, status, published_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW())
         RETURNING id, seller_id, title, description, price_etb, negotiable, category_id, condition, location_id, status, created_at, updated_at, ARRAY[]::text[] AS photo_urls`,
        [
          listingId,
          input.sellerId,
          input.title,
          input.description,
          input.priceETB,
          input.negotiable,
          input.categoryId,
          input.condition,
          input.locationId
        ]
      );

      for (const [index, url] of input.photoUrls.entries()) {
        await client.query(
          `INSERT INTO listing_images (id, listing_id, image_url, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [createId("img"), listingId, url, index]
        );
      }

      await client.query("COMMIT");
      return {
        ...mapListing(listingResult.rows[0]),
        photoUrls: input.photoUrls
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateListingStatus(listingId: string, status: ListingStatus, adminId: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<ListingRow>(
        `UPDATE listings
         SET status = $2,
             published_at = CASE WHEN $2 = 'active' THEN COALESCE(published_at, NOW()) ELSE published_at END,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, seller_id, title, description, price_etb, negotiable, category_id, condition, location_id, status, created_at, updated_at,
           COALESCE((SELECT array_agg(image_url ORDER BY sort_order) FROM listing_images WHERE listing_id = listings.id), '{}') AS photo_urls`,
        [listingId, status]
      );
      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await insertModerationAction(client, adminId, status === "hidden" ? "hide_listing" : "approve_listing", listingId);
      await client.query("COMMIT");
      await notifyUser(result.rows[0].seller_id, "Listing update", status === "hidden" ? "One of your listings was hidden by moderation." : "One of your listings is now active.", { listingId });
      return mapListing(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listFavorites(userId: string) {
    const result = await pool.query<FavoriteRow>(
      `SELECT id, listing_id, user_id, created_at
       FROM favorites
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(mapFavorite);
  }

  async toggleFavorite(userId: string, listingId: string) {
    const existing = await pool.query<{ id: string }>(
      `SELECT id FROM favorites WHERE user_id = $1 AND listing_id = $2 LIMIT 1`,
      [userId, listingId]
    );

    if (existing.rowCount && existing.rows[0]) {
      await pool.query(`DELETE FROM favorites WHERE id = $1`, [existing.rows[0].id]);
      return this.listFavorites(userId);
    }

    await pool.query(
      `INSERT INTO favorites (id, listing_id, user_id)
       VALUES ($1, $2, $3)`,
      [createId("fav"), listingId, userId]
    );
    return this.listFavorites(userId);
  }

  async startThread(input: StartThreadRequest): Promise<ChatThread> {
    const existing = await pool.query<ThreadRow>(
      `SELECT id, listing_id, buyer_id, seller_id, status, last_message_at
       FROM chat_threads
       WHERE listing_id = $1 AND buyer_id = $2
       LIMIT 1`,
      [input.listingId, input.buyerId]
    );

    if (existing.rowCount && existing.rows[0]) {
      return mapThread(existing.rows[0]);
    }

    const listingResult = await pool.query<{ seller_id: string }>(
      `SELECT seller_id FROM listings WHERE id = $1 LIMIT 1`,
      [input.listingId]
    );
    if (!listingResult.rowCount || !listingResult.rows[0]) {
      throw new Error("Listing not found");
    }

    const result = await pool.query<ThreadRow>(
      `INSERT INTO chat_threads (id, listing_id, buyer_id, seller_id, status, last_message_at)
       VALUES ($1, $2, $3, $4, 'active', NOW())
       RETURNING id, listing_id, buyer_id, seller_id, status, last_message_at`,
      [createId("thr"), input.listingId, input.buyerId, listingResult.rows[0].seller_id]
    );

    return mapThread(result.rows[0]);
  }

  async getThread(threadId: string) {
    const result = await pool.query<ThreadRow>(
      `SELECT id, listing_id, buyer_id, seller_id, status, last_message_at
       FROM chat_threads
       WHERE id = $1
       LIMIT 1`,
      [threadId]
    );
    return result.rows[0] ? mapThread(result.rows[0]) : undefined;
  }
  async listThreads(userId: string) {
    const result = await pool.query<ThreadRow>(
      `SELECT id, listing_id, buyer_id, seller_id, status, last_message_at
       FROM chat_threads
       WHERE buyer_id = $1 OR seller_id = $1
       ORDER BY last_message_at DESC`,
      [userId]
    );
    return result.rows.map(mapThread);
  }

  async listMessages(threadId: string) {
    const result = await pool.query<MessageRow>(
      `SELECT id, thread_id, sender_id, text, created_at, read_at
       FROM messages
       WHERE thread_id = $1
       ORDER BY created_at ASC`,
      [threadId]
    );
    return result.rows.map(mapMessage);
  }

  async sendMessage(input: SendMessageRequest): Promise<Message> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const threadResult = await client.query<{ id: string; buyer_id: string; seller_id: string }>(`SELECT id, buyer_id, seller_id FROM chat_threads WHERE id = $1 LIMIT 1`, [input.threadId]);
      if (!threadResult.rowCount) {
        throw new Error("Thread not found");
      }

      const result = await client.query<MessageRow>(
        `INSERT INTO messages (id, thread_id, sender_id, text)
         VALUES ($1, $2, $3, $4)
         RETURNING id, thread_id, sender_id, text, created_at, read_at`,
        [createId("msg"), input.threadId, input.senderId, input.text]
      );

      await client.query(
        `UPDATE chat_threads
         SET last_message_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [input.threadId]
      );

      await client.query("COMMIT");
      const recipientId = threadResult.rows[0].buyer_id === input.senderId ? threadResult.rows[0].seller_id : threadResult.rows[0].buyer_id;
      await notifyUser(recipientId, "New message", input.text, { threadId: input.threadId });
      return mapMessage(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createReport(input: CreateReportRequest): Promise<Report> {
    const result = await pool.query<ReportRow>(
      `INSERT INTO reports (id, target_type, target_id, reporter_id, reason_code, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')
       RETURNING id, target_type, target_id, reporter_id, reason_code, notes, status, created_at`,
      [createId("rep"), input.targetType, input.targetId, input.reporterId, input.reasonCode, input.notes ?? null]
    );
    return mapReport(result.rows[0]);
  }

  async listReports() {
    const result = await pool.query<ReportRow>(
      `SELECT id, target_type, target_id, reporter_id, reason_code, notes, status, created_at
       FROM reports
       ORDER BY created_at DESC`
    );
    return result.rows.map(mapReport);
  }

  async resolveReport(reportId: string, adminId: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<ReportRow>(
        `UPDATE reports
         SET status = 'resolved', updated_at = NOW()
         WHERE id = $1
         RETURNING id, target_type, target_id, reporter_id, reason_code, notes, status, created_at`,
        [reportId]
      );
      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await insertModerationAction(client, adminId, "resolve_report", reportId);
      await client.query("COMMIT");
      await notifyUser(result.rows[0].reporter_id, "Report resolved", "A report you submitted was reviewed by the moderation team.", { reportId });
      return mapReport(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async suspendUser(userId: string, adminId: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<UserRow>(
        `UPDATE users
         SET status = 'suspended', updated_at = NOW()
         WHERE id = $1
         RETURNING id, phone, verification_status, display_name, preferred_language, profile_type, status, is_phone_verified, is_admin`,
        [userId]
      );
      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await client.query(
        `UPDATE sessions
         SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId]
      );
      await insertModerationAction(client, adminId, "suspend_user", userId);
      await client.query("COMMIT");
      return mapUser(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export const store = new MarketplaceStore();






















