const tls = require("tls");
const { payment_status } = require("@prisma/client");
const prisma = require("../config/prismaClient");
const { PACKAGES, getPackageByAmount, getPackageByPlanKey } = require("../lib/packages");
const { MIKROTIK_ENABLED, getStatus: getMikrotikStatus } = require("../config/mikrotik");
const { getAccessToken } = require("../config/mpesa");

const PaymentStatus = payment_status || {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
  FRAUD_DETECTED: "FRAUD_DETECTED",
  VERIFICATION_FAILED: "VERIFICATION_FAILED",
  COMPLETED_BUT_MAC_FAILED: "COMPLETED_BUT_MAC_FAILED",
  REFUNDED: "REFUNDED",
};

const BUSINESS_TZ = "Africa/Nairobi";
const PENDING_TIMEOUT_MS = 120 * 1000;
const CALLBACK_PROMPT_WINDOW_MS = 10 * 60 * 1000;
const CALLBACK_SILENCE_WINDOW_MS = 5 * 60 * 1000;
const SSL_WARNING_DAYS = 14;
const SSL_DANGER_DAYS = 3;
const SSL_CACHE_TTL_MS = 5 * 60 * 1000;

const PAID_DB_STATUSES = new Set([
  PaymentStatus.COMPLETED,
  PaymentStatus.COMPLETED_BUT_MAC_FAILED,
]);

const CALLBACK_AUDIT_REASONS = [
  "callback_received_successful",
  "callback_received_non_zero_result",
  "fraud_detected_amount_mismatch",
];

let _sslCache = { expiresAt: 0, host: null, result: null };

function getNairobiParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: Number(hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function getNairobiBoundaries(now = new Date()) {
  const parts = getNairobiParts(now);
  const todayStartUtc = new Date(`${parts.dateStr}T00:00:00+03:00`);
  const yesterdayStartUtc = new Date(todayStartUtc.getTime() - 24 * 3600 * 1000);
  const yesterdayCutoffUtc = new Date(now.getTime() - 24 * 3600 * 1000);
  const weekStartUtc = new Date(todayStartUtc.getTime() - 6 * 24 * 3600 * 1000);
  const prevWeekStartUtc = new Date(weekStartUtc.getTime() - 7 * 24 * 3600 * 1000);
  const prevWeekCutoffUtc = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  return {
    now,
    currentHour: parts.hour,
    todayStartUtc,
    yesterdayStartUtc,
    yesterdayCutoffUtc,
    weekStartUtc,
    prevWeekStartUtc,
    prevWeekCutoffUtc,
  };
}

function maskPhone(raw) {
  if (!raw) return "Unknown";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length >= 12) {
    digits = "0" + digits.slice(3);
  } else if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    digits = "0" + digits;
  }
  if (digits.length >= 7) {
    return `${digits.slice(0, 4)} ••• ${digits.slice(-3)}`;
  }
  return digits || "Unknown";
}

function resolvePlan(planKey, amount) {
  const pkg =
    (planKey ? getPackageByPlanKey(planKey) : null) ||
    getPackageByAmount(amount);
  return {
    key: pkg?.timeLabel || planKey || `amt_${amount}`,
    name: pkg?.label || `KSh ${amount}`,
    price: Number(amount) || 0,
  };
}

function classifyPayment(payment, nowMs) {
  const requestedMs = new Date(payment.requestedAt).getTime();
  if (PAID_DB_STATUSES.has(payment.status)) {
    return { category: "paid", resultCode: 0 };
  }
  if (payment.status === PaymentStatus.PENDING) {
    if (nowMs - requestedMs > PENDING_TIMEOUT_MS) {
      return { category: "failed", resultCode: 1037 };
    }
    return { category: "pending", resultCode: null };
  }
  if (payment.status === PaymentStatus.EXPIRED) {
    return { category: "failed", resultCode: 1037 };
  }
  return { category: "failed", resultCode: -1 };
}

function summarizePrompts(payments, nowMs) {
  let revenue = 0;
  let paid = 0;
  let failed = 0;
  let pending = 0;
  let oldestPendingAt = null;

  for (const p of payments) {
    const cls = classifyPayment(p, nowMs);
    if (cls.category === "paid") {
      paid++;
      revenue += Number(p.amount) || 0;
    } else if (cls.category === "pending") {
      pending++;
      if (!oldestPendingAt || p.requestedAt < oldestPendingAt) {
        oldestPendingAt = p.requestedAt;
      }
    } else {
      failed++;
    }
  }

  const finished = paid + failed;
  const successRate = finished > 0 ? (paid / finished) * 100 : null;
  return {
    revenue,
    paid,
    failed,
    pending,
    finished,
    totalPrompts: payments.length,
    successRate,
    oldestPendingAt: oldestPendingAt ? oldestPendingAt.toISOString() : null,
  };
}

function getHttpsHostForSslCheck() {
  const candidates = [
    process.env.SSL_CHECK_URL,
    process.env.MPESA_CALLBACK_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_PORTAL_ORIGIN,
  ];
  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    try {
      const parsed = new URL(raw);
      if (
        parsed.protocol === "https:" &&
        parsed.hostname &&
        parsed.hostname !== "localhost" &&
        parsed.hostname !== "127.0.0.1"
      ) {
        return {
          host: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : 443,
        };
      }
    } catch {
      // Ignore invalid URL
    }
  }
  return null;
}

async function checkSslCertificate() {
  const target = getHttpsHostForSslCheck();
  if (!target) return null;

  const now = Date.now();
  if (
    _sslCache.result &&
    _sslCache.host === `${target.host}:${target.port}` &&
    now < _sslCache.expiresAt
  ) {
    return _sslCache.result;
  }

  const result = await new Promise((resolve) => {
    let settled = false;
    const done = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    const socket = tls.connect(
      {
        host: target.host,
        port: target.port,
        servername: target.host,
        rejectUnauthorized: false,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          socket.end();
          if (!cert || !cert.valid_to) {
            return done(null);
          }
          const validToMs = new Date(cert.valid_to).getTime();
          if (!Number.isFinite(validToMs)) {
            return done(null);
          }
          const daysRemaining = Math.floor((validToMs - Date.now()) / (24 * 3600 * 1000));
          const status =
            daysRemaining < SSL_DANGER_DAYS
              ? "danger"
              : daysRemaining < SSL_WARNING_DAYS
                ? "warning"
                : "good";
          done({
            id: "ssl",
            status,
            daysRemaining,
            validTo: new Date(validToMs).toISOString(),
            host: target.host,
          });
        } catch {
          socket.destroy();
          done(null);
        }
      }
    );

    socket.setTimeout(2500, () => {
      socket.destroy();
      done(null);
    });
    socket.on("error", () => {
      socket.destroy();
      done(null);
    });
  });

  if (result) {
    _sslCache = {
      host: `${target.host}:${target.port}`,
      expiresAt: now + SSL_CACHE_TTL_MS,
      result,
    };
  }

  return result;
}

async function checkMpesaHealth() {
  if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET) {
    return {
      id: "mpesa",
      status: "danger",
      latencyMs: null,
      detail: "Credentials missing",
    };
  }

  const start = Date.now();
  try {
    const token = await Promise.race([
      getAccessToken(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3500)
      ),
    ]);
    const latencyMs = Date.now() - start;
    if (!token) {
      return {
        id: "mpesa",
        status: "danger",
        latencyMs: null,
        detail: "Auth failed",
      };
    }
    return {
      id: "mpesa",
      status: "good",
      latencyMs,
      detail: null,
    };
  } catch {
    return {
      id: "mpesa",
      status: "danger",
      latencyMs: null,
      detail: "Not responding",
    };
  }
}

async function checkDatabaseHealth() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      id: "database",
      status: "good",
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      id: "database",
      status: "danger",
      latencyMs: null,
    };
  }
}

async function checkCallbacksHealth(todayStartUtc, now) {
  const promptWindowStart = new Date(now.getTime() - CALLBACK_PROMPT_WINDOW_MS);
  const callbackWindowStart = new Date(now.getTime() - CALLBACK_SILENCE_WINDOW_MS);

  const [lastCallbackUpdate, lastCompletedToday, promptsLast10Min, callbacksLast5Min] =
    await Promise.all([
      prisma.paymentstatusupdate.findFirst({
        where: {
          createdAt: { gte: todayStartUtc },
          reason: { in: CALLBACK_AUDIT_REASONS },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.payment.findFirst({
        where: {
          mpesa_reference: { not: null },
          OR: [
            { completedAt: { gte: todayStartUtc } },
            { failedAt: { gte: todayStartUtc } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        select: { completedAt: true, failedAt: true, updatedAt: true },
      }),
      prisma.payment.count({
        where: {
          mpesa_reference: { not: null },
          requestedAt: { gte: promptWindowStart },
        },
      }),
      prisma.paymentstatusupdate.count({
        where: {
          createdAt: { gte: callbackWindowStart },
          reason: { in: CALLBACK_AUDIT_REASONS },
        },
      }),
    ]);

  let lastCallbackAt = lastCallbackUpdate?.createdAt || null;
  if (lastCompletedToday) {
    const candidate =
      lastCompletedToday.completedAt ||
      lastCompletedToday.failedAt ||
      lastCompletedToday.updatedAt;
    if (!lastCallbackAt || (candidate && candidate > lastCallbackAt)) {
      lastCallbackAt = candidate;
    }
  }

  const isSilentWarning = promptsLast10Min > 0 && callbacksLast5Min === 0;

  return {
    id: "callbacks",
    status: isSilentWarning ? "warning" : "good",
    lastCallbackAt: lastCallbackAt ? lastCallbackAt.toISOString() : null,
    promptsLast10Min,
    callbacksLast5Min,
  };
}

async function buildHealthSection(todayStartUtc, now) {
  const checks = [
    checkMpesaHealth(),
    checkCallbacksHealth(todayStartUtc, now),
    checkDatabaseHealth(),
    MIKROTIK_ENABLED ? getMikrotikStatus() : Promise.resolve(null),
    checkSslCertificate(),
  ];

  const [mpesaRes, callbacksRes, dbRes, routerRes, sslRes] =
    await Promise.allSettled(checks);

  const items = [];

  if (mpesaRes.status === "fulfilled" && mpesaRes.value) {
    items.push(mpesaRes.value);
  }
  if (callbacksRes.status === "fulfilled" && callbacksRes.value) {
    items.push(callbacksRes.value);
  }
  if (MIKROTIK_ENABLED && routerRes.status === "fulfilled" && routerRes.value) {
    const r = routerRes.value;
    if (r.data?.mode !== "dev") {
      items.push({
        id: "router",
        status: r.success ? "good" : "danger",
        connectedUsers: r.data?.connectedUsers ?? 0,
      });
    }
  }
  if (dbRes.status === "fulfilled" && dbRes.value) {
    items.push(dbRes.value);
  }
  if (sslRes.status === "fulfilled" && sslRes.value) {
    items.push(sslRes.value);
  }

  return items;
}

async function getAdminOverviewData(range = "today") {
  const normalizedRange = range === "week" ? "week" : "today";
  const bounds = getNairobiBoundaries(new Date());
  const nowMs = bounds.now.getTime();

  const paymentSelect = {
    id: true,
    transactionId: true,
    phone: true,
    amount: true,
    planKey: true,
    status: true,
    mpesa_reference: true,
    mpesa_receipt_number: true,
    requestedAt: true,
    completedAt: true,
    failedAt: true,
  };

  // Run independent sections with allSettled so a single failing query doesn't blank the page
  const [
    todayPaymentsRes,
    yesterdayPaymentsRes,
    weekPaymentsRes,
    prevWeekPaymentsRes,
    activeSessionsRes,
    healthRes,
    notificationsRes,
  ] = await Promise.allSettled([
    prisma.payment.findMany({
      where: {
        mpesa_reference: { not: null },
        requestedAt: { gte: bounds.todayStartUtc, lte: bounds.now },
      },
      select: paymentSelect,
      orderBy: { requestedAt: "desc" },
    }),
    prisma.payment.findMany({
      where: {
        mpesa_reference: { not: null },
        requestedAt: { gte: bounds.yesterdayStartUtc, lt: bounds.todayStartUtc },
      },
      select: {
        amount: true,
        status: true,
        requestedAt: true,
      },
    }),
    normalizedRange === "week"
      ? prisma.payment.findMany({
          where: {
            mpesa_reference: { not: null },
            requestedAt: { gte: bounds.weekStartUtc, lte: bounds.now },
          },
          select: {
            amount: true,
            status: true,
            requestedAt: true,
          },
        })
      : Promise.resolve(null),
    normalizedRange === "week"
      ? prisma.payment.findMany({
          where: {
            mpesa_reference: { not: null },
            requestedAt: {
              gte: bounds.prevWeekStartUtc,
              lt: bounds.prevWeekCutoffUtc,
            },
          },
          select: {
            amount: true,
            status: true,
            requestedAt: true,
          },
        })
      : Promise.resolve(null),
    prisma.session.count({
      where: {
        disconnectedAt: null,
        expiryTime: { gt: bounds.now },
      },
    }),
    buildHealthSection(bounds.todayStartUtc, bounds.now),
    Promise.all([
      prisma.supportrequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, subject: true, name: true, createdAt: true },
      }),
      prisma.payment.count({
        where: {
          status: PaymentStatus.COMPLETED_BUT_MAC_FAILED,
          requestedAt: { gte: bounds.todayStartUtc },
        },
      }),
    ]),
  ]);

  const todayOk = todayPaymentsRes.status === "fulfilled";
  const todayPayments = todayOk ? todayPaymentsRes.value : [];
  const activeSessionsOk = activeSessionsRes.status === "fulfilled";
  const activeSessions = activeSessionsOk ? activeSessionsRes.value : 0;

  // Today summary (always needed for header live status, plan sales, feed)
  const todaySummary = todayOk ? summarizePrompts(todayPayments, nowMs) : null;

  // Yesterday up to now & hourly buckets
  const yesterdayOk = yesterdayPaymentsRes.status === "fulfilled";
  const yesterdayPayments = yesterdayOk ? yesterdayPaymentsRes.value : [];
  const yesterdayByNowPayments = yesterdayPayments.filter(
    (p) => p.requestedAt <= bounds.yesterdayCutoffUtc
  );
  const yesterdayByNowSummary = summarizePrompts(yesterdayByNowPayments, nowMs);

  // KPI section
  let kpisSection;
  if (!todayOk || !activeSessionsOk || (normalizedRange === "week" && weekPaymentsRes.status !== "fulfilled")) {
    kpisSection = { ok: false, error: "Couldn't load summary metrics." };
  } else if (normalizedRange === "today") {
    const revDeltaPct =
      yesterdayByNowSummary.revenue > 0
        ? ((todaySummary.revenue - yesterdayByNowSummary.revenue) /
            yesterdayByNowSummary.revenue) *
          100
        : null;

    kpisSection = {
      ok: true,
      data: {
        range: "today",
        isEmptyDay: todaySummary.totalPrompts === 0,
        revenue: todaySummary.revenue,
        comparisonRevenue: yesterdayByNowSummary.revenue,
        revenueDeltaPct: revDeltaPct,
        activeSessions,
        todayPlansSold: todaySummary.paid,
        paidCount: todaySummary.paid,
        finishedCount: todaySummary.finished,
        successRate: todaySummary.successRate,
        pendingCount: todaySummary.pending,
        oldestPendingAt: todaySummary.oldestPendingAt,
      },
    };
  } else {
    const weekPayments = weekPaymentsRes.value || [];
    const weekSummary = summarizePrompts(weekPayments, nowMs);
    const prevWeekPayments =
      prevWeekPaymentsRes.status === "fulfilled" && prevWeekPaymentsRes.value
        ? prevWeekPaymentsRes.value
        : [];
    const prevWeekSummary = summarizePrompts(prevWeekPayments, nowMs);
    const weekDeltaPct =
      prevWeekSummary.revenue > 0
        ? ((weekSummary.revenue - prevWeekSummary.revenue) /
            prevWeekSummary.revenue) *
          100
        : null;

    kpisSection = {
      ok: true,
      data: {
        range: "week",
        isEmptyDay: todaySummary.totalPrompts === 0,
        revenue: weekSummary.revenue,
        comparisonRevenue: prevWeekSummary.revenue,
        revenueDeltaPct: weekDeltaPct,
        activeSessions,
        todayPlansSold: todaySummary.paid,
        paidCount: weekSummary.paid,
        finishedCount: weekSummary.finished,
        successRate: weekSummary.successRate,
        pendingCount: todaySummary.pending,
        oldestPendingAt: todaySummary.oldestPendingAt,
      },
    };
  }

  // Chart section
  let chartSection;
  if (!todayOk || (normalizedRange === "week" && weekPaymentsRes.status !== "fulfilled")) {
    chartSection = { ok: false, error: "Couldn't load revenue chart." };
  } else if (normalizedRange === "today") {
    const todayHourly = Array.from({ length: 24 }, (_, h) =>
      h <= bounds.currentHour ? 0 : null
    );
    const yesterdayHourly = Array(24).fill(0);

    for (const p of todayPayments) {
      if (PAID_DB_STATUSES.has(p.status)) {
        const h = Math.floor(
          (new Date(p.requestedAt).getTime() - bounds.todayStartUtc.getTime()) /
            3600_000
        );
        if (h >= 0 && h < 24) {
          todayHourly[h] = (todayHourly[h] || 0) + (Number(p.amount) || 0);
        }
      }
    }
    for (const p of yesterdayPayments) {
      if (PAID_DB_STATUSES.has(p.status)) {
        const h = Math.floor(
          (new Date(p.requestedAt).getTime() - bounds.yesterdayStartUtc.getTime()) /
            3600_000
        );
        if (h >= 0 && h < 24) {
          yesterdayHourly[h] += Number(p.amount) || 0;
        }
      }
    }

    const revDeltaPct =
      yesterdayByNowSummary.revenue > 0
        ? ((todaySummary.revenue - yesterdayByNowSummary.revenue) /
            yesterdayByNowSummary.revenue) *
          100
        : null;

    chartSection = {
      ok: true,
      data: {
        range: "today",
        isEmpty: todaySummary.totalPrompts === 0,
        currentHour: bounds.currentHour,
        todayRevenue: todaySummary.revenue,
        yesterdayByNowRevenue: yesterdayByNowSummary.revenue,
        revenueDeltaPct: revDeltaPct,
        hourly: todayHourly,
        yesterdayHourly,
      },
    };
  } else {
    const weekPayments = weekPaymentsRes.value || [];
    const dailyTotals = Array(7).fill(0);
    for (const p of weekPayments) {
      if (PAID_DB_STATUSES.has(p.status)) {
        const idx = Math.floor(
          (new Date(p.requestedAt).getTime() - bounds.weekStartUtc.getTime()) /
            (24 * 3600_000)
        );
        if (idx >= 0 && idx < 7) {
          dailyTotals[idx] += Number(p.amount) || 0;
        }
      }
    }
    const days = dailyTotals.map((revenue, idx) => {
      const noonUtc = new Date(
        bounds.weekStartUtc.getTime() + idx * 24 * 3600_000 + 12 * 3600_000
      );
      return {
        label: noonUtc.toLocaleDateString("en-GB", {
          weekday: "short",
          timeZone: BUSINESS_TZ,
        }),
        fullLabel: noonUtc.toLocaleDateString("en-GB", {
          weekday: "long",
          timeZone: BUSINESS_TZ,
        }),
        revenue,
        isToday: idx === 6,
      };
    });

    chartSection = {
      ok: true,
      data: {
        range: "week",
        isEmpty: days.every((d) => d.revenue === 0),
        days,
      },
    };
  }

  // Live payments feed section (today's prompts, newest first, masked on server)
  let paymentsSection;
  if (!todayOk) {
    paymentsSection = { ok: false, error: "Couldn't load payments." };
  } else {
    const counts = { all: 0, paid: 0, pending: 0, failed: 0 };
    const mappedRows = todayPayments.map((p) => {
      const cls = classifyPayment(p, nowMs);
      counts.all++;
      counts[cls.category]++;
      const plan = resolvePlan(p.planKey, p.amount);
      return {
        id: p.transactionId,
        requestedAt: p.requestedAt.toISOString(),
        maskedPhone: maskPhone(p.phone),
        planName: plan.name,
        amount: Number(p.amount) || 0,
        category: cls.category,
        resultCode: cls.resultCode,
        receipt: p.mpesa_receipt_number || null,
      };
    });

    paymentsSection = {
      ok: true,
      data: {
        isEmpty: mappedRows.length === 0,
        counts,
        rows: mappedRows.slice(0, 50),
      },
    };
  }

  // Plan sales section (always today)
  let planMixSection;
  if (!todayOk) {
    planMixSection = { ok: false, error: "Couldn't load plan sales." };
  } else {
    const planBuckets = new Map();
    for (const [priceStr, pkg] of Object.entries(PACKAGES)) {
      planBuckets.set(pkg.timeLabel, {
        key: pkg.timeLabel,
        name: pkg.label,
        price: Number(priceStr),
        soldCount: 0,
        revenue: 0,
      });
    }

    for (const p of todayPayments) {
      if (!PAID_DB_STATUSES.has(p.status)) continue;
      const plan = resolvePlan(p.planKey, p.amount);
      if (!planBuckets.has(plan.key)) {
        planBuckets.set(plan.key, {
          key: plan.key,
          name: plan.name,
          price: plan.price,
          soldCount: 0,
          revenue: 0,
        });
      }
      const bucket = planBuckets.get(plan.key);
      bucket.soldCount += 1;
      bucket.revenue += Number(p.amount) || 0;
    }

    const plans = Array.from(planBuckets.values()).sort(
      (a, b) => b.revenue - a.revenue || b.soldCount - a.soldCount
    );
    const totalSold = plans.reduce((acc, item) => acc + item.soldCount, 0);
    const totalRevenue = plans.reduce((acc, item) => acc + item.revenue, 0);

    planMixSection = {
      ok: true,
      data: {
        isEmpty: totalSold === 0,
        totalSold,
        totalRevenue,
        plans,
      },
    };
  }

  // System health section
  const healthSection =
    healthRes.status === "fulfilled"
      ? { ok: true, data: { items: healthRes.value } }
      : { ok: false, error: "Couldn't load system health." };

  // Notifications summary for the top bar bell
  let notifications = [];
  if (notificationsRes.status === "fulfilled") {
    const [supportItems, macFailedCount] = notificationsRes.value;
    if (macFailedCount > 0) {
      notifications.push({
        id: "mac-failed",
        title: `${macFailedCount} paid device${macFailedCount > 1 ? "s" : ""} awaiting router sync`,
        subtitle: "Retry queued automatically",
        createdAt: bounds.now.toISOString(),
        tone: "warning",
      });
    }
    for (const s of supportItems) {
      notifications.push({
        id: `support-${s.id}`,
        title: s.subject || "Support request",
        subtitle: s.name ? `From ${s.name}` : "Customer message",
        createdAt: s.createdAt.toISOString(),
        tone: "neutral",
      });
    }
  }

  const weekday = bounds.now.toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: BUSINESS_TZ,
  });
  const dayAndMonth = bounds.now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: BUSINESS_TZ,
  });

  return {
    generatedAt: bounds.now.toISOString(),
    businessDate: `${weekday}, ${dayAndMonth}`,
    hasTodayPrompts: todayOk ? todayPayments.length > 0 : null,
    kpis: kpisSection,
    chart: chartSection,
    payments: paymentsSection,
    planMix: planMixSection,
    health: healthSection,
    notifications,
  };
}

module.exports = {
  getAdminOverviewData,
  maskPhone,
  getNairobiBoundaries,
  classifyPayment,
};
