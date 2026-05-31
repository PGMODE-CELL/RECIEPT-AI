interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Contact {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface Company {
  name: string;
  logo?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface Invoice {
  id: string;
  invoiceNumber?: string;
  date: string;
  dueDate?: string;
  status?: string;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  discount?: number;
  total: number;
  notes?: string;
  terms?: string;
}

interface Bill {
  id: string;
  billNumber?: string;
  date: string;
  dueDate?: string;
  status?: string;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  discount?: number;
  total: number;
  notes?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildContactHTML(contact: Contact): string {
  const lines = [contact.name];
  if (contact.address) lines.push(contact.address);
  const cityLine = [contact.city, contact.state, contact.zip]
    .filter(Boolean)
    .join(", ");
  if (cityLine) lines.push(cityLine);
  if (contact.country) lines.push(contact.country);
  if (contact.phone) lines.push(contact.phone);
  if (contact.email) lines.push(contact.email);
  return lines.join("<br>");
}

function buildCompanyHTML(company: Company): string {
  const lines = [company.name];
  if (company.address) lines.push(company.address);
  const cityLine = [company.city, company.state, company.zip]
    .filter(Boolean)
    .join(", ");
  if (cityLine) lines.push(cityLine);
  if (company.country) lines.push(company.country);
  if (company.phone) lines.push(company.phone);
  if (company.email) lines.push(company.email);
  if (company.website) lines.push(company.website);
  return lines.join("<br>");
}

function buildItemsTable(items: InvoiceItem[]): string {
  let html = `
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px;text-align:left;border-bottom:2px solid #d1d5db;">Description</th>
          <th style="padding:10px;text-align:right;border-bottom:2px solid #d1d5db;">Qty</th>
          <th style="padding:10px;text-align:right;border-bottom:2px solid #d1d5db;">Rate</th>
          <th style="padding:10px;text-align:right;border-bottom:2px solid #d1d5db;">Amount</th>
        </tr>
      </thead>
      <tbody>`;

  for (const item of items) {
    html += `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${item.description}</td>
          <td style="padding:10px;text-align:right;border-bottom:1px solid #e5e7eb;">${item.quantity}</td>
          <td style="padding:10px;text-align:right;border-bottom:1px solid #e5e7eb;">${formatCurrency(item.rate)}</td>
          <td style="padding:10px;text-align:right;border-bottom:1px solid #e5e7eb;">${formatCurrency(item.amount)}</td>
        </tr>`;
  }

  html += `
      </tbody>
    </table>`;
  return html;
}

function buildTotalsHTML(
  subtotal: number,
  tax: number,
  discount: number,
  total: number,
  taxRate?: number
): string {
  let html = `
    <div style="display:flex;justify-content:flex-end;margin-top:20px;">
      <div style="width:250px;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>`;

  if (discount > 0) {
    html += `
        <div style="display:flex;justify-content:space-between;padding:6px 0;">
          <span>Discount:</span>
          <span>-${formatCurrency(discount)}</span>
        </div>`;
  }

  if (tax > 0) {
    html += `
        <div style="display:flex;justify-content:space-between;padding:6px 0;">
          <span>Tax${taxRate ? ` (${taxRate}%)` : ""}:</span>
          <span>${formatCurrency(tax)}</span>
        </div>`;
  }

  html += `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #374151;font-size:18px;font-weight:bold;">
          <span>Total:</span>
          <span>${formatCurrency(total)}</span>
        </div>
      </div>
    </div>`;
  return html;
}

function getPrintCSS(): string {
  return `
    @page { margin: 1cm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      margin: 0;
      padding: 20px;
    }
    @media print {
      body { padding: 0; }
    }
  `;
}

function openPrintWindow(html: string): void {
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) {
    alert("Please allow popups to generate PDF.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

export function generateInvoicePDF(
  invoice: Invoice,
  contact: Contact,
  items: InvoiceItem[],
  company: Company
): void {
  const companyHTML = buildCompanyHTML(company);
  const contactHTML = buildContactHTML(contact);
  const itemsTable = buildItemsTable(items);

  const subtotal =
    invoice.subtotal ??
    items.reduce((sum, item) => sum + item.amount, 0);
  const tax = invoice.tax ?? 0;
  const discount = invoice.discount ?? 0;
  const total = invoice.total ?? subtotal - discount + tax;
  const taxRate = invoice.taxRate;

  const totalsHTML = buildTotalsHTML(subtotal, tax, discount, total, taxRate);

  const logoHTML = company.logo
    ? `<img src="${company.logo}" alt="Company Logo" style="max-height:60px;margin-bottom:10px;" />`
    : `<div style="font-size:24px;font-weight:bold;color:#2563eb;margin-bottom:10px;">${company.name}</div>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.invoiceNumber ?? invoice.id}</title>
      <style>${getPrintCSS()}</style>
    </head>
    <body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;">
        <div>
          ${logoHTML}
          <div style="font-size:13px;color:#6b7280;">${companyHTML}</div>
        </div>
        <div style="text-align:right;">
          <h1 style="margin:0;font-size:32px;color:#2563eb;">INVOICE</h1>
          <div style="margin-top:8px;font-size:14px;color:#6b7280;">
            <div><strong>Invoice #:</strong> ${invoice.invoiceNumber ?? invoice.id}</div>
            <div><strong>Date:</strong> ${formatDate(invoice.date)}</div>
            ${invoice.dueDate ? `<div><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</div>` : ""}
            ${invoice.status ? `<div><strong>Status:</strong> ${invoice.status}</div>` : ""}
          </div>
        </div>
      </div>

      <div style="margin-bottom:30px;">
        <h3 style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;color:#9ca3af;">Bill To</h3>
        <div style="font-size:14px;">${contactHTML}</div>
      </div>

      ${itemsTable}
      ${totalsHTML}

      ${invoice.notes ? `
        <div style="margin-top:30px;">
          <h3 style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;color:#9ca3af;">Notes</h3>
          <p style="font-size:14px;color:#6b7280;white-space:pre-wrap;">${invoice.notes}</p>
        </div>` : ""}

      ${invoice.terms ? `
        <div style="margin-top:20px;">
          <h3 style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;color:#9ca3af;">Terms & Conditions</h3>
          <p style="font-size:14px;color:#6b7280;white-space:pre-wrap;">${invoice.terms}</p>
        </div>` : ""}
    </body>
    </html>`;

  openPrintWindow(html);
}

export function generateBillPDF(
  bill: Bill,
  contact: Contact,
  items: InvoiceItem[],
  company: Company
): void {
  const companyHTML = buildCompanyHTML(company);
  const contactHTML = buildContactHTML(contact);
  const itemsTable = buildItemsTable(items);

  const subtotal =
    bill.subtotal ??
    items.reduce((sum, item) => sum + item.amount, 0);
  const tax = bill.tax ?? 0;
  const discount = bill.discount ?? 0;
  const total = bill.total ?? subtotal - discount + tax;
  const taxRate = bill.taxRate;

  const totalsHTML = buildTotalsHTML(subtotal, tax, discount, total, taxRate);

  const logoHTML = company.logo
    ? `<img src="${company.logo}" alt="Company Logo" style="max-height:60px;margin-bottom:10px;" />`
    : `<div style="font-size:24px;font-weight:bold;color:#dc2626;margin-bottom:10px;">${company.name}</div>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill ${bill.billNumber ?? bill.id}</title>
      <style>${getPrintCSS()}</style>
    </head>
    <body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;">
        <div>
          ${logoHTML}
          <div style="font-size:13px;color:#6b7280;">${companyHTML}</div>
        </div>
        <div style="text-align:right;">
          <h1 style="margin:0;font-size:32px;color:#dc2626;">BILL</h1>
          <div style="margin-top:8px;font-size:14px;color:#6b7280;">
            <div><strong>Bill #:</strong> ${bill.billNumber ?? bill.id}</div>
            <div><strong>Date:</strong> ${formatDate(bill.date)}</div>
            ${bill.dueDate ? `<div><strong>Due Date:</strong> ${formatDate(bill.dueDate)}</div>` : ""}
            ${bill.status ? `<div><strong>Status:</strong> ${bill.status}</div>` : ""}
          </div>
        </div>
      </div>

      <div style="margin-bottom:30px;">
        <h3 style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;color:#9ca3af;">Bill From</h3>
        <div style="font-size:14px;">${contactHTML}</div>
      </div>

      ${itemsTable}
      ${totalsHTML}

      ${bill.notes ? `
        <div style="margin-top:30px;">
          <h3 style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;color:#9ca3af;">Notes</h3>
          <p style="font-size:14px;color:#6b7280;white-space:pre-wrap;">${bill.notes}</p>
        </div>` : ""}
    </body>
    </html>`;

  openPrintWindow(html);
}

export function generateReportPDF(
  title: string,
  content: string,
  period: string
): void {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>${getPrintCSS()}</style>
    </head>
    <body>
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="margin:0;font-size:28px;color:#1f2937;">${title}</h1>
        <div style="margin-top:8px;font-size:14px;color:#6b7280;">${period}</div>
      </div>

      <div style="font-size:14px;line-height:1.8;">
        ${content}
      </div>

      <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
        Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </div>
    </body>
    </html>`;

  openPrintWindow(html);
}
