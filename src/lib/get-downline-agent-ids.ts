import { prisma } from "./prisma-client";

type RecursiveRow = { id: string };

/**
 * Returns all recursive downline agent IDs for a given root agent.
 * Root agent ID itself is not included in the result.
 */
export async function getDownlineAgentIds(rootAgentId: string): Promise<string[]> {
  if (!rootAgentId) return [];

  const rows = await prisma.$queryRaw<RecursiveRow[]>`
    WITH RECURSIVE downline AS (
      SELECT u.id
      FROM "User" u
      WHERE u."uplineId" = ${rootAgentId}
        AND u.role = 'AGENT'
      UNION ALL
      SELECT child.id
      FROM "User" child
      INNER JOIN downline d ON child."uplineId" = d.id
      WHERE child.role = 'AGENT'
    )
    SELECT DISTINCT id FROM downline
  `;

  return rows.map((row) => row.id);
}

