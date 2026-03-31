import { seedRanks } from "./ranks";
import { seedRateCards } from "./rateCards";
import { seedPartnersAndProducts } from "./products";
import { seedInitialAdmin } from "./admin";
import { seedDocumentTemplates } from "./documentTemplates";

async function main() {
  await seedRanks();
  await seedRateCards();
  await seedPartnersAndProducts();
  await seedDocumentTemplates();
  await seedInitialAdmin();
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => {});

