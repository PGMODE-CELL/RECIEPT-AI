import { Link } from "react-router";
import { Wallet } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-white">ReceiptAI</span>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-400">
          <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Data We Collect</h2>
          <p>We collect only the data you explicitly provide: account information (email, name) and financial data (transactions, invoices, receipts, contacts) that you enter into the Software. We do not collect any data automatically beyond standard server logs.</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. How We Use Your Data</h2>
          <p>Your data is used exclusively to provide the Software's functionality — generating reports, processing invoices, scanning receipts, and similar accounting features. We never use your data for advertising, training AI models, or any purpose other than delivering the service.</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Data Storage & Security</h2>
          <p>Data is stored on your own infrastructure (self-hosted) or on servers you designate. All data is encrypted in transit via TLS. We implement industry-standard security measures including audit logging, access controls, and regular security reviews.</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Data Sharing</h2>
          <p>We do not sell, rent, or share your personal or financial data with any third parties. Data is never used for purposes beyond operating the Software for you.</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Data Retention</h2>
          <p>You retain full control over your data. You may export or delete all your data at any time through the Software's settings or by contacting us.</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Contact</h2>
          <p>For privacy-related inquiries, please open an issue on our GitHub repository.</p>
        </div>
      </div>
    </div>
  );
}
