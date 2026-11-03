/**
 * Installer.report Client Portal - Job View
 * 
 * Client-specific view of their job, deliverables, and approval gates.
 * Accessed via share token URL.
 */

interface PortalJobPageProps {
  params: Promise<{ token: string }>;
}

export default async function PortalJobPage({ params }: PortalJobPageProps) {
  const { token } = await params;
  
  // TODO: Fetch job data by token from database
  // Validate token and check expiration
  // Load job, workflow stages, deliverables, pending approvals
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Installer.report</h1>
          <p className="text-sm text-gray-600">Client Portal</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">
            Portal Under Development
          </h2>
          <p className="text-yellow-800">
            Job portal functionality is currently being implemented.
          </p>
          <p className="text-sm text-yellow-700 mt-2">
            Access token: <code className="bg-yellow-100 px-2 py-1 rounded">{token}</code>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Project Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  In Progress
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Stage:</span>
                <span className="font-medium">Production</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Progress:</span>
                <span className="font-medium">60%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Pending Approvals</h3>
            <p className="text-gray-600">
              No pending approvals at this time.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Workflow</h3>
            <div className="space-y-2">
              <div className="flex items-center text-green-600">
                <span className="mr-2">✓</span>
                <span>Strategy & Planning</span>
              </div>
              <div className="flex items-center text-blue-600 font-medium">
                <span className="mr-2">→</span>
                <span>Content Production</span>
              </div>
              <div className="flex items-center text-gray-400">
                <span className="mr-2">○</span>
                <span>Review & Approval</span>
              </div>
              <div className="flex items-center text-gray-400">
                <span className="mr-2">○</span>
                <span>Final Delivery</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Deliverables</h3>
            <p className="text-gray-600">
              Deliverables will appear here as they are completed.
            </p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Activity Timeline</h3>
          <div className="space-y-4">
            <div className="border-l-2 border-blue-500 pl-4 py-2">
              <p className="font-medium">Project Started</p>
              <p className="text-sm text-gray-600">Your project has been assigned to our agency team.</p>
              <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          <p>
            Questions? Contact your account manager or email{' '}
            <a href="mailto:support@installer.report" className="text-blue-600 hover:underline">
              support@installer.report
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
