import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { validateApiKey } from "@/lib/api-auth";
import { buildMachineReadableProfile } from "shared";

type JsonRecord = Record<string, unknown>;

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function hasPermission(permissions: unknown, accepted: string[]): boolean {
  const list = Array.isArray(permissions)
    ? permissions.map(String)
    : typeof permissions === "string"
      ? permissions.split(",").map((item) => item.trim())
      : [];
  return list.includes("all") || accepted.some((item) => list.includes(item));
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error, docs: "/api/v1/docs" },
      { status: auth.status },
    );
  }

  if (!hasPermission(auth.permissions, ["read", "answers"])) {
    return NextResponse.json(
      { error: "Requires 'read' permission" },
      { status: 403 },
    );
  }

  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "expert";
  const id = params.get("id");
  const slug = params.get("slug");
  const limit = Math.min(parseInt(params.get("limit") || "20", 10), 100);
  const offset = parseInt(params.get("offset") || "0", 10);

  const admin = getAdmin();

  if (type === "business") {
    if (!auth.ownerId) {
      return NextResponse.json(
        { error: "Business profiles require owner-bound API key" },
        { status: 403 },
      );
    }

    let query = admin
      .from("business_accounts")
      .select("*", { count: "exact" })
      .eq("owner_id", auth.ownerId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (id) query = query.eq("id", id);
    if (slug) query = query.eq("slug", slug);

    const { data: businesses, count, error } = await query;
    if (error) {
      console.error("[machine-profiles] business error:", error);
      return NextResponse.json(
        { error: "Failed to load business profiles" },
        { status: 500 },
      );
    }

    const businessIds = (businesses ?? []).map((item) => item.id);
    const { data: locations } = businessIds.length
      ? await admin
          .from("business_locations")
          .select("*")
          .in("business_id", businessIds)
      : { data: [] };

    const locationsByBusiness: Record<string, JsonRecord[]> = {};
    for (const location of (locations ?? []) as JsonRecord[]) {
      const businessId = String(location.business_id);
      if (!locationsByBusiness[businessId]) locationsByBusiness[businessId] = [];
      locationsByBusiness[businessId].push(location);
    }

    const data = (businesses ?? []).map((business) => {
      const storedProfile = asRecord(business.machine_profile);
      const proof = asRecord(business.proof_of_business);
      const services = asStringArray(storedProfile.knowsAbout);
      const url = business.website || `${APP_URL}/for-business`;

      return {
        id: business.id,
        type: "business",
        name: business.name,
        slug: business.slug,
        url,
        city: business.city,
        niche: business.niche,
        status: business.status,
        local_sales_index: business.local_sales_index,
        locations: locationsByBusiness[business.id] ?? [],
        machine_profile: {
          ...buildMachineReadableProfile({
            name: business.name,
            type: "business",
            url,
            city: business.city,
            services,
            priceFrom: business.avg_check,
            proof,
            sla: typeof storedProfile.sla === "string" ? storedProfile.sla : null,
          }),
          ...storedProfile,
        },
        proof_of_business: proof,
        updated_at: business.updated_at,
      };
    });

    return NextResponse.json({
      data,
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        has_more: offset + limit < (count ?? 0),
      },
    });
  }

  let query = admin
    .from("profiles")
    .select(
      "id, full_name, slug, qualification, city, bio, consultation_price, consultation_url, years_experience, knows_about, is_verified, trust_score, avg_rating, review_count, proof_of_human, machine_profile, trust_components, updated_at, niches(name, slug, icon)",
      { count: "exact" },
    )
    .eq("is_published", true)
    .order("trust_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (id) query = query.eq("id", id);
  if (slug) query = query.eq("slug", slug);

  const { data: experts, count, error } = await query;
  if (error) {
    console.error("[machine-profiles] expert error:", error);
    return NextResponse.json(
      { error: "Failed to load expert profiles" },
      { status: 500 },
    );
  }

  const data = (experts ?? []).map((expert) => {
    const storedProfile = asRecord(expert.machine_profile);
    const proof = asRecord(expert.proof_of_human);
    const url = `${APP_URL}/experts/${expert.slug}`;
    const niche = expert.niches as unknown as JsonRecord | null;

    return {
      id: expert.id,
      type: "expert",
      full_name: expert.full_name,
      slug: expert.slug,
      url,
      qualification: expert.qualification,
      city: expert.city,
      trust_score: expert.trust_score,
      trust_components: asRecord(expert.trust_components),
      is_verified: expert.is_verified,
      rating: {
        avg: expert.avg_rating ?? 0,
        count: expert.review_count ?? 0,
      },
      niche,
      machine_profile: {
        ...buildMachineReadableProfile({
          name: expert.full_name,
          type: "expert",
          url,
          city: expert.city,
          services: expert.knows_about,
          priceFrom: expert.consultation_price,
          bookingUrl: expert.consultation_url,
          proof,
          sla: typeof storedProfile.sla === "string" ? storedProfile.sla : null,
        }),
        ...storedProfile,
      },
      proof_of_human: proof,
      updated_at: expert.updated_at,
    };
  });

  return NextResponse.json({
    data,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      has_more: offset + limit < (count ?? 0),
    },
  });
}
