interface CSVExportable {
  [key: string]: string | number | boolean | null | undefined;
}

function escapeCSVField(field: string | number | boolean | null | undefined): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function objectToCSVRow(obj: CSVExportable): string {
  return Object.values(obj).map(escapeCSVField).join(",");
}

function generateCSVContent(data: CSVExportable[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(objectToCSVRow);
  return [headers.join(","), ...rows].join("\n");
}

function triggerDownload(csvContent: string, filename: string): void {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}

export function exportToCSV(data: CSVExportable[], filename: string): void {
  const csv = generateCSVContent(data);
  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  triggerDownload(csv, safeFilename);
}

export function importFromCSV(file: File): Promise<CSVExportable[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          resolve([]);
          return;
        }

        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

        if (lines.length < 1) {
          resolve([]);
          return;
        }

        const headers = parseCSVLine(lines[0]).map((h) => h.trim());
        const result: CSVExportable[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const obj: CSVExportable = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j] ?? "";
          }
          result.push(obj);
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read CSV file."));
    };

    reader.readAsText(file, "utf-8");
  });
}

export function exportInvoicesCSV(invoices: CSVExportable[]): void {
  const data = invoices.map((inv) => ({
    id: inv.id ?? "",
    invoiceNumber: inv.invoiceNumber ?? "",
    contactName: inv.contactName ?? "",
    contactEmail: inv.contactEmail ?? "",
    date: inv.date ?? "",
    dueDate: inv.dueDate ?? "",
    status: inv.status ?? "",
    subtotal: inv.subtotal ?? 0,
    tax: inv.tax ?? 0,
    discount: inv.discount ?? 0,
    total: inv.total ?? 0,
    notes: inv.notes ?? "",
  }));

  exportToCSV(data, "invoices.csv");
}

export function exportContactsCSV(contacts: CSVExportable[]): void {
  const data = contacts.map((c) => ({
    id: c.id ?? "",
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    zip: c.zip ?? "",
    country: c.country ?? "",
    type: c.type ?? "",
    notes: c.notes ?? "",
  }));

  exportToCSV(data, "contacts.csv");
}

export function exportTransactionsCSV(transactions: CSVExportable[]): void {
  const data = transactions.map((t) => ({
    id: t.id ?? "",
    date: t.date ?? "",
    description: t.description ?? "",
    type: t.type ?? "",
    amount: t.amount ?? 0,
    category: t.category ?? "",
    account: t.account ?? "",
    status: t.status ?? "",
    reference: t.reference ?? "",
    contactName: t.contactName ?? "",
    notes: t.notes ?? "",
  }));

  exportToCSV(data, "transactions.csv");
}
