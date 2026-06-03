import { Link } from "react-router";
import { Wallet } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-white">ReceiptAI</span>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Terms of Service</h1>
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-400">
          <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Acceptance of Terms</h2>
          <p>By accessing or using ReceiptAI ("the Software"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Software.</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Open-Source License</h2>
          <p>ReceiptAI is free and open-source software. You may use, modify, and distribute it in accordance with the license provided in the repository. No warranty is provided — the Software is used "as is".</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must notify us immediately of any unauthorized use.</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Data Privacy</h2>
          <p>You retain full ownership of any data you enter into the Software. We do not sell, rent, or share your data with third parties. See our Privacy Policy for details.</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Limitation of Liability</h2>
          <p>In no event shall the creators or contributors be liable for any damages arising out of the use or inability to use the Software, even if advised of the possibility of such damages.</p>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">6. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the Software after changes constitutes acceptance of the new terms.</p>
        </div>
      </div>
    </div>
  );
}
