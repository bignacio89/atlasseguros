import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const { prisma } = await import("../src/lib/prisma-client");
  const { runWithRlsContext } = await import("../src/lib/prisma-rls");

  const result = await runWithRlsContext(
    prisma,
    {
      userId: "test_user_rls",
      role: "AGENT",
    },
    async () => {
      const rows = await prisma.$queryRaw<
        Array<{ user_id: string | null; user_role: string | null }>
      >`
        SELECT
          current_setting('app.current_user_id', true) as user_id,
          current_setting('app.current_user_role', true) as user_role
      `;
      return rows[0];
    },
  );

  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

