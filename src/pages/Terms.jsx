import React from 'react';
import PageHeader from '@/components/go/PageHeader';
import { Shield, Lock } from 'lucide-react';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Legal" isRoot={false} />

      <div className="space-y-12">
        {/* Terms of Service */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Shield className="text-emerald-600" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Terms of Service</h1>
              <p className="text-xs text-muted-foreground">Last updated: July 4, 2026</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-1">1. Acceptance of Terms</h3>
              <p>By using GO ("the Platform"), you agree to these Terms of Service. GO is a marketplace that connects customers who need moving services with independent drivers. GO is not a moving company and does not employ drivers directly.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">2. Customer Responsibilities</h3>
              <p>Customers agree to provide accurate information about their items, addresses, and move dates. Customers are responsible for ensuring items are properly packed and ready for transport. Customers must pay the agreed-upon price before or at the time of service.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">3. Driver Responsibilities</h3>
              <p>Drivers are independent contractors, not employees of GO. Drivers must hold a valid driver's license, maintain proper insurance, and operate safe, registered vehicles. Drivers are responsible for the safe transport of customer items and may be held liable for damage or loss caused during transit.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">4. Liability & Damage Claims</h3>
              <p>GO facilitates dispute resolution between customers and drivers but is not directly liable for damage to items during a move. Customers must report damage or loss through the Platform's damage report system. Unresolved claims may result in deductions from the driver's payout. Drivers should maintain adequate insurance coverage for transported goods.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">5. Payments & Fees</h3>
              <p>GO charges a 25% platform fee on each move, included in the customer's quote. This fee covers platform operations, driver verification, dispute resolution, and customer support. Drivers receive a payout based on truck size, distance, and item weight. Payments are processed securely through Stripe. Payment plans (installments) are available for qualifying moves.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">6. Cancellations</h3>
              <p>Customers may cancel a pending move at no charge. Once a driver has accepted a job, cancellation terms are determined between the customer and driver. GO reserves the right to suspend accounts for repeated cancellations or no-shows.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">7. Account Termination</h3>
              <p>GO reserves the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or receive repeated valid complaints. Drivers may be removed from the Platform for safety, quality, or compliance issues.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">8. Limitation of Liability</h3>
              <p>GO is provided "as is" without warranties of any kind. GO shall not be liable for indirect, incidental, or consequential damages arising from the use of the Platform or services arranged through it. The maximum liability of GO for any claim shall not exceed the platform fee collected on the relevant transaction.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">9. Changes to Terms</h3>
              <p>GO may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated Terms.</p>
            </div>
          </div>
        </section>

        {/* Privacy Policy */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Lock className="text-blue-600" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground">Last updated: July 4, 2026</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-1">1. Information We Collect</h3>
              <p>We collect the following types of information: Account information (name, email, phone number), Move details (addresses, item lists, dates), Driver information (license number, insurance documents, vehicle registration), and Payment information (processed securely through Stripe — we do not store card details).</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">2. How We Use Your Information</h3>
              <p>We use your information to: facilitate move bookings and driver matching, process payments and payouts, communicate about your moves, provide customer support, verify driver identities and credentials, and improve our services.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">3. Information Sharing</h3>
              <p>We share information with: Drivers and customers to facilitate moves (contact info, addresses, item details), Stripe for payment processing, and service providers who help us operate the Platform. We do not sell your personal information to third parties.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">4. Data Security</h3>
              <p>We take reasonable measures to protect your information, including encrypted data storage, secure file uploads for sensitive documents, and access controls. However, no method of transmission over the internet is 100% secure.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">5. Document Retention</h3>
              <p>Driver documents (licenses, insurance, registration) are retained for the duration of the driver's account and for a reasonable period thereafter for legal compliance. Customers may request deletion of their data, subject to legal retention requirements.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">6. Your Rights</h3>
              <p>You have the right to: access your personal data, correct inaccurate information, request deletion of your data (subject to legal requirements), and opt out of promotional communications. To exercise these rights, contact us through the Support page.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">7. Cookies</h3>
              <p>The Platform uses cookies and similar technologies for authentication, preferences, and analytics. You can control cookies through your browser settings.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">8. Children's Privacy</h3>
              <p>The Platform is not intended for users under 18. We do not knowingly collect information from minors.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">9. Contact</h3>
              <p>For privacy questions or requests, use the Support page to reach our team.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}