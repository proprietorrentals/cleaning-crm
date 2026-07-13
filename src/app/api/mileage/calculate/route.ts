import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveEmployeeByAuthUserId } from "@/lib/supabase/employee-session";
import { getDrivingDistance, RoutingProviderError } from "@/lib/maps/routing";
import { NextRequest, NextResponse } from "next/server";

type MileageRequestBody = {
  from_job_id?: string;
  to_job_id?: string;
  fromJobId?: string;
  toJobId?: string;
};

type LimitedRateState = {
  count: number;
  windowStartMs: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const mileageRateLimitState = new Map<string, LimitedRateState>();

function toMiles(distanceMeters: number) {
  return Number((distanceMeters / 1609.344).toFixed(2));
}

function toMinutes(durationSeconds: number) {
  return Math.max(1, Math.round(durationSeconds / 60));
}

function buildRoutePreviewUrl(originAddress: string, destinationAddress: string) {
  const params = new URLSearchParams({
    api: "1",
    origin: originAddress,
    destination: destinationAddress,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function checkRateLimit(userId: string) {
  const now = Date.now();
  const current = mileageRateLimitState.get(userId);

  if (!current || now - current.windowStartMs >= RATE_LIMIT_WINDOW_MS) {
    mileageRateLimitState.set(userId, { count: 1, windowStartMs: now });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  mileageRateLimitState.set(userId, {
    count: current.count + 1,
    windowStartMs: current.windowStartMs,
  });
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MileageRequestBody;
    const fromJobId = (body.from_job_id ?? body.fromJobId)?.trim();
    const toJobId = (body.to_job_id ?? body.toJobId)?.trim();

    if (!fromJobId || !toJobId) {
      return NextResponse.json({ error: "Invalid origin or destination: select both jobs." }, { status: 400 });
    }

    if (fromJobId === toJobId) {
      return NextResponse.json({ error: "Invalid origin or destination: choose two different jobs." }, { status: 400 });
    }

    const serverSupabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: sessionError,
    } = await serverSupabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Too many mileage calculations. Please wait a minute and try again." },
        { status: 429 },
      );
    }

    const { profile: employee } = await getActiveEmployeeByAuthUserId(serverSupabase, user.id);
    if (!employee) {
      return NextResponse.json({ error: "Employee access is not enabled." }, { status: 403 });
    }

    const { data: jobs, error: jobError } = await serverSupabase
      .from("jobs")
      .select("id, customer_id, tenant_id, assigned_employee_id")
      .in("id", [fromJobId, toJobId])
      .eq("assigned_employee_id", employee.id)
      .eq("tenant_id", employee.tenant_id);

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 400 });
    }

    if (!jobs || jobs.length !== 2) {
      return NextResponse.json({ error: "Invalid origin or destination: one or both jobs were not found." }, { status: 404 });
    }

    const fromJob = jobs.find((job) => job.id === fromJobId);
    const toJob = jobs.find((job) => job.id === toJobId);

    if (!fromJob || !toJob) {
      return NextResponse.json({ error: "Invalid origin or destination: one or both jobs were not found." }, { status: 404 });
    }

    if (fromJob.assigned_employee_id !== employee.id || toJob.assigned_employee_id !== employee.id) {
      return NextResponse.json(
        { error: "Employee not assigned to one or both jobs." },
        { status: 403 },
      );
    }

    if (!fromJob.tenant_id || !toJob.tenant_id || fromJob.tenant_id !== toJob.tenant_id) {
      return NextResponse.json({ error: "Tenant mismatch between selected jobs." }, { status: 403 });
    }

    const { data: customers, error: customerError } = await serverSupabase
      .from("customers")
      .select("id, address, tenant_id")
      .in("id", [fromJob.customer_id, toJob.customer_id]);

    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 400 });
    }

    const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer]));

    const fromAddress = customerById.get(fromJob.customer_id)?.address?.trim() ?? "";
    const toAddress = customerById.get(toJob.customer_id)?.address?.trim() ?? "";

    if (!fromAddress || !toAddress) {
      return NextResponse.json(
        { error: "Missing job address: one or both selected jobs do not have a service address." },
        { status: 400 },
      );
    }

    const fromCustomerTenant = customerById.get(fromJob.customer_id)?.tenant_id;
    const toCustomerTenant = customerById.get(toJob.customer_id)?.tenant_id;

    if (
      fromCustomerTenant !== fromJob.tenant_id ||
      toCustomerTenant !== toJob.tenant_id
    ) {
      return NextResponse.json({ error: "Tenant mismatch between jobs and customer addresses." }, { status: 403 });
    }

    const route = await getDrivingDistance({
      originAddress: fromAddress,
      destinationAddress: toAddress,
    });

    return NextResponse.json({
      calculated_miles: toMiles(route.distanceMeters),
      estimated_duration_minutes: toMinutes(route.durationSeconds),
      origin_address: fromAddress,
      destination_address: toAddress,
      distance_provider: route.provider,
      route_preview_url: buildRoutePreviewUrl(fromAddress, toAddress),
    });
  } catch (err) {
    if (err instanceof RoutingProviderError) {
      const messageByCode: Record<RoutingProviderError["code"], { status: number; message: string }> = {
        INVALID_ADDRESS: {
          status: 400,
          message: "Invalid origin or destination address.",
        },
        NO_ROUTE: {
          status: 422,
          message: "No route found between the selected jobs.",
        },
        PROVIDER_CONFIG_MISSING: {
          status: 500,
          message: "Provider error: map routing is not configured.",
        },
        PROVIDER_REQUEST_FAILED: {
          status: 502,
          message: "Provider error while calculating route.",
        },
        PROVIDER_RESPONSE_INVALID: {
          status: 502,
          message: "Provider error: invalid routing response.",
        },
      };

      const mapped = messageByCode[err.code];
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to calculate mileage.",
      },
      { status: 500 },
    );
  }
}