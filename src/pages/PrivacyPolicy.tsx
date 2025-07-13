import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-2">Account Information</h3>
            <p>
              When you create an account, we collect your email address, name, and password. This information is necessary to provide you with access to our Service.
            </p>

            <h3 className="text-xl font-medium mb-2">Usage Data</h3>
            <p>
              We collect information about how you use our Service, including:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Pipeline configurations and execution logs</li>
              <li>API usage patterns and performance metrics</li>
              <li>Feature usage analytics</li>
              <li>Error logs and debugging information</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">Technical Information</h3>
            <p>
              We automatically collect certain technical information including IP addresses, browser type, device information, and access logs for security and optimization purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Provide and maintain our Service</li>
              <li>Process your transactions and manage your account</li>
              <li>Improve our Service through analytics and feedback</li>
              <li>Communicate with you about updates, security alerts, and support</li>
              <li>Detect and prevent fraud and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Information Sharing and Disclosure</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties except:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>With your explicit consent</li>
              <li>To service providers who assist in operating our Service</li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a business transaction (merger, acquisition, etc.)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Regular backup and disaster recovery procedures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights Under GDPR</h2>
            <p>
              If you are located in the European Union, you have the following rights:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Request transfer of your data</li>
              <li><strong>Restriction:</strong> Request limitation of processing</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at privacy@yourcompany.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our Service and fulfill legal obligations:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Account data: Until account deletion</li>
              <li>Usage logs: 6 months for analytics, 3 months for execution logs</li>
              <li>Security logs: 90 days</li>
              <li>Backup data: Up to 30 days</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to enhance your experience. These include:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Essential cookies:</strong> Required for Service functionality</li>
              <li><strong>Analytics cookies:</strong> Help us understand usage patterns</li>
              <li><strong>Preference cookies:</strong> Remember your settings</li>
            </ul>
            <p className="mt-4">
              You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p>
              Our Service is not directed to children under 13. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p><strong>Email:</strong> privacy@yourcompany.com</p>
              <p><strong>Data Protection Officer:</strong> dpo@yourcompany.com</p>
              <p><strong>Address:</strong> Your Company Address</p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;