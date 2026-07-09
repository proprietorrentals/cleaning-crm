import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveEmployeeByAuthUserId } from "@/lib/supabase/employee-session";
import { NextRequest, NextResponse } from "next/server";

type MileageRequestBody = {
  fromJobId?: string;
  toJobId?: string;
};

type GeoPoint = { lat: number; lon: number };

async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "cleaning-crm-mileage/1.0",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  const first = results[0];

  if (!first) {
    return null;
  }

  return { lat: Number(first.lat), lon: Number(first.lon) };
}

function haversineMiles(from: GeoPoint, to: GeoPoint) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusMiles * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function routeMiles(from: GeoPoint, to: GeoPoint): Promise<number | null> {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { routes?: Array<{ distance: number }> };
  const distanceMeters = data.routes?.[0]?.distance;

  if (!distanceMeters) {
    return null;
  }

  return distanceMeters / 1609.344;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MileageRequestBody;
    const fromJobId = body.fromJobId?.trim();
    const toJobId = body.toJobId?.trim();

    if (!fromJobId || !toJobId) {
      return NextResponse.json({ error: "Select both Job A and Job B." }, { status: 400 });
    }

    if (fromJobId === toJobId) {
      return NextResponse.json({ error: "Choose two different jobs." }, { status: 400 });
    }

    const serverSupabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: sessionError,
    } = await serverSupabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { profile: employee } = await getActiveEmployeeByAuthUserId(serverSupabase, user.id);
    if (!employee) {
      return NextResponse.json({ error: "Employee access is not enabled." }, { status: 403 });
    }

    const { data: jobs, error: jobError } = await serverSupabase
      .from("jobs")
      .select("id, customer_id, scheduled_date")
      .in("id", [fromJobId, toJobId])
      .eq("assigned_employee_id", employee.id);

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 400 });
    }

    if (!jobs || jobs.length !== 2) {
      return NextResponse.json({ error: "One or both jobs were not found in your assigned jobs." }, { status: 404 });
    }

    const { data: customers, error: customerError } = await serverSupabase
      .from("customers")
      .select("id, address")
      .in("id", jobs.map((job) => job.customer_id));

    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 400 });
    }

    const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer]));
    const fromJob = jobs.find((job) => job.id === fromJobId);
    const toJob = jobs.find((job) => job.id === toJobId);

    if (!fromJob || !toJob) {
      return NextResponse.json({ error: "One or both jobs were not found." }, { status: 404 });
    }

    const fromAddress = customerById.get(fromJob.customer_id)?.address?.trim() ?? "";
    const toAddress = customerById.get(toJob.customer_id)?.address?.trim() ?? "";

    if (!fromAddress || !toAddress) {
      return NextResponse.json({ error: "Address required to calculate mileage." }, { status: 400 });
    }

    const [fromPoint, toPoint] = await Promise.all([geocodeAddress(fromAddress), geocodeAddress(toAddress)]);

    if (!fromPoint || !toPoint) {
      return NextResponse.json({ error: "Unable to auto-calculate mileage. Manual miles required." }, { status: 422 });
    }

    const routeEstimate = await routeMiles(fromPoint, toPoint);
    const miles = routeEstimate ?? haversineMiles(fromPoint, toPoint);

    return NextResponse.json({
      miles: Number(miles.toFixed(2)),
      fromAddress,
      toAddress,
      date: fromJob.scheduled_date,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to calculate mileage.",
      },
      { status: 500 },
    );
  }
}