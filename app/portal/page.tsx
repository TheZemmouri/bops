/**
 * Installer.report Client Portal Landing
 * 
 * Entry point for clients (installers/suppliers) to access their jobs,
 * product reviews, marketing deliverables, and analytics.
 * 
 * Clients access via share token: /portal/{token}
 */

export default function PortalLanding() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Installer.report
          </h1>
          <p className="text-gray-600">
            The Intelligence Layer for the Auto Restyling Industry
          </p>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">Client Portal</h2>
            <p className="text-gray-600 mb-4">
              Access your jobs, deliverables, and approvals via your unique access link.
            </p>
            <p className="text-sm text-gray-500">
              If you have a portal access token, visit:
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                /portal/[your-token]
              </code>
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">For Installers</h2>
            <ul className="text-gray-600 space-y-2">
              <li>• View your marketing content packages</li>
              <li>• Download social media assets</li>
              <li>• Approve deliverables</li>
              <li>• Track project status</li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">For Suppliers</h2>
            <ul className="text-gray-600 space-y-2">
              <li>• Review product scoring data</li>
              <li>• Monitor product reviews</li>
              <li>• Track advertising campaigns</li>
              <li>• Access lead generation data</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Portal functionality is currently under development.
              Client access tokens will be provided via email when your job is created.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            Questions? Contact support at{' '}
            <a href="mailto:support@installer.report" className="text-blue-600 hover:underline">
              support@installer.report
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
