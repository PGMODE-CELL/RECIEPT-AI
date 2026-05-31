import { getDb } from "../api/queries/connection";
import { currencies } from "./schema";

async function seed() {
  const db = getDb();

  const data = [
    { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: "1.000000" },
    { code: "EUR", name: "Euro", symbol: "€", exchangeRate: "0.920000" },
    { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: "0.790000" },
    { code: "INR", name: "Indian Rupee", symbol: "₹", exchangeRate: "83.000000" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥", exchangeRate: "150.000000" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$", exchangeRate: "1.350000" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$", exchangeRate: "1.520000" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥", exchangeRate: "7.200000" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$", exchangeRate: "1.340000" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ", exchangeRate: "3.670000" },
  ];

  for (const c of data) {
    try {
      await db.insert(currencies).values(c);
    } catch {
      // Already exists, skip
    }
  }

  console.log("Currencies seeded");
}

seed().catch(console.error);
