import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma-client";

type CalculateCommissionInput = {
  contractId: string;
  actorId: string;
  actorType: "operations" | "admin" | "system";
  dryRun: boolean;
};

type DraftCommissionRow = {
  agentId: string;
  payoutAmount: Prisma.Decimal;
  differential: Prisma.Decimal | null;
  isOverride: boolean;
  notes: string;
};

type CalculationResult = {
  createdCount: number;
  cancelledCount: number;
};

export async function calculateContractCommissions(
  input: CalculateCommissionInput,
): Promise<CalculationResult> {
  const contract = await prisma.contract.findUnique({
    where: { id: input.contractId },
    select: {
      id: true,
      agentId: true,
      leadType: true,
      premiumAmount: true,
      points: true,
      startDate: true,
      offer: {
        select: {
          product: {
            select: {
              commissionUpfrontPct: true,
            },
          },
        },
      },
    },
  });

  if (!contract) throw new Error("Contract not found");

  const commissionPool = new Prisma.Decimal(contract.premiumAmount).mul(
    contract.offer.product.commissionUpfrontPct,
  );

  // Phase A guard: no upfront commission configured -> no payouts.
  if (commissionPool.lte(0)) {
    await prisma.auditLog.create({
      data: {
        entity: "CONTRACT",
        entityId: contract.id,
        action: "RECALCULATED",
        actorId: input.actorId,
        actorType: input.actorType,
        metadata: {
          dryRun: input.dryRun,
          reason: "no_upfront_commission_pool",
        },
      },
    });
    return { createdCount: 0, cancelledCount: 0 };
  }

  const hierarchy = await getAgentHierarchy(contract.agentId);
  const payoutRows = await buildWaterfallRows({
    hierarchy,
    leadType: contract.leadType,
    effectiveDate: contract.startDate,
    points: new Prisma.Decimal(contract.points),
    pool: commissionPool,
  });

  const result = await prisma.$transaction(async (tx) => {
    let cancelledCount = 0;

    if (!input.dryRun) {
      const cancelled = await tx.commissionRecord.updateMany({
        where: {
          contractId: contract.id,
          status: "PENDING",
          isDryRun: false,
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          notes: "Cancelled due to recalculation",
        },
      });
      cancelledCount = cancelled.count;
    } else {
      await tx.commissionRecord.deleteMany({
        where: {
          contractId: contract.id,
          isDryRun: true,
        },
      });
    }

    let createdCount = 0;
    if (payoutRows.length > 0) {
      const created = await tx.commissionRecord.createMany({
        data: payoutRows.map((row) => ({
          contractId: contract.id,
          agentId: row.agentId,
          payoutAmount: row.payoutAmount,
          differential: row.differential,
          isOverride: row.isOverride,
          isDryRun: input.dryRun,
          status: "PENDING",
          notes: row.notes,
        })),
      });
      createdCount = created.count;
    }

    await tx.auditLog.create({
      data: {
        entity: "CONTRACT",
        entityId: contract.id,
        action: "RECALCULATED",
        actorId: input.actorId,
        actorType: input.actorType,
        metadata: {
          dryRun: input.dryRun,
          cancelledCount,
          createdCount,
        },
      },
    });

    return { createdCount, cancelledCount };
  });

  return result;
}

async function getAgentHierarchy(rootAgentId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; rankId: string | null; depth: number }>>(
    Prisma.sql`
      WITH RECURSIVE upline_chain AS (
        SELECT u.id, u."rankId", u."uplineId", 0::int AS depth
        FROM "User" u
        WHERE u.id = ${rootAgentId}
        UNION ALL
        SELECT parent.id, parent."rankId", parent."uplineId", uc.depth + 1
        FROM "User" parent
        INNER JOIN upline_chain uc ON uc."uplineId" = parent.id
        WHERE uc.depth < 9
      )
      SELECT id, "rankId", depth
      FROM upline_chain
      ORDER BY depth ASC
    `,
  );

  return rows;
}

async function buildWaterfallRows(input: {
  hierarchy: Array<{ id: string; rankId: string | null; depth: number }>;
  leadType: "ATLAS" | "STANDARD";
  effectiveDate: Date;
  points: Prisma.Decimal;
  pool: Prisma.Decimal;
}): Promise<DraftCommissionRow[]> {
  const rows: DraftCommissionRow[] = [];

  let previousGross = new Prisma.Decimal(0);
  let remainingPool = new Prisma.Decimal(input.pool);

  for (const level of input.hierarchy) {
    if (remainingPool.lte(0)) break;
    if (!level.rankId) continue;

    // Phase B: resolve applicable rate card for each hierarchy node.
    const rateCard = await prisma.rateCard.findFirst({
      where: {
        rankId: level.rankId,
        leadType: input.leadType,
        effectiveDate: { lte: input.effectiveDate },
      },
      orderBy: { effectiveDate: "desc" },
      select: { euroPerPoint: true },
    });

    if (!rateCard) continue;

    const gross = input.points.mul(rateCard.euroPerPoint);
    const delta = gross.sub(previousGross);
    if (delta.lte(0)) continue;

    const payout = Prisma.Decimal.min(delta, remainingPool);
    if (payout.lte(0)) continue;

    rows.push({
      agentId: level.id,
      payoutAmount: payout,
      differential: level.depth === 0 ? null : payout,
      isOverride: level.depth > 0,
      notes: level.depth === 0 ? "Base commission payout" : "Override differential payout",
    });

    remainingPool = remainingPool.sub(payout);
    previousGross = gross;
  }

  return rows;
}
