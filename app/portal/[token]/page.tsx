/**
 * Installer.report Client Portal - Job View
 * 
 * Client-specific view of their job, deliverables, and approval gates.
 * Accessed via share token URL.
 */

import { getJob, getPendingApprovals } from "@/lib/server/jobs";
import Link from "next/link";

interface PortalJobPageProps {
  params: Promise<{ token: string }>;
}

async function getJobByToken(token: string) {
  // Token format: job_{jobId}_{hash}
  // Extract jobId from token
  const match = token.match(/^job_(\d+_[a-z0-9]+)_/);
  if (!match) return null;
  
  const jobId = `job_${match[1]}`;
  
  try {
    const job = await getJob(jobId);
    if (!job) return null;
    
    // TODO: Validate token hash against job
    // For now, just return job
    
    const approvals = await getPendingApprovals(jobId);
    
    return { job, approvals };
  } catch (error) {
    console.error('[portal] Error fetching job:', error);
    return null;
  }
}

export default async function PortalJobPage({ params }: PortalJobPageProps) {
  const { token } = await params;
  
  const data = await getJobByToken(token);
  
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Access Token</h2>
          <p className="text-gray-600 mb-6">
            This portal link is invalid or has expired. Please check your email for the correct link or contact support.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }
  
  const { job, approvals } = data;
  
  const statusColors = {
    intake: 'bg-gray-100 text-gray-800',
    strategy: 'bg-blue-100 text-blue-800',
    production: 'bg-yellow-100 text-yellow-800',
    review: 'bg-purple-100 text-purple-800',
    delivery: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  
  const completedStages = job.workflow.filter(s => s.status === 'completed').length;
  const progress = Math.round((completedStages / job.workflow.length) * 100);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Installer.report</h1>
          <p className="text-sm text-gray-600">Client Portal</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">{job.projectTitle}</h2>
          <p className="text-gray-600 mt-2">Client: {job.clientName}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Project Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[job.status]}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Current Stage:</span>
                <span className="font-medium">{job.currentStage?.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Progress:</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Pending Approvals</h3>
            {approvals.length === 0 ? (
              <p className="text-gray-600">
                No pending approvals at this time.
              </p>
            ) : (
              <div className="space-y-3">
                {approvals.map(approval => (
                  <div key={approval.id} className="border border-yellow-200 bg-yellow-50 rounded p-3">
                    <p className="font-medium text-yellow-900">{approval.title}</p>
                    <p className="text-sm text-yellow-700 mt-1">{approval.description}</p>
                    {approval.estimatedCost && (
                      <p className="text-xs text-yellow-600 mt-2">
                        Estimated cost: ${(approval.estimatedCost / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Workflow</h3>
            <div className="space-y-2">
              {job.workflow.map((stage, index) => {
                const icon = stage.status === 'completed' ? '✓'
                  : stage.status === 'in_progress' ? '→'
                  : '○';
                const color = stage.status === 'completed' ? 'text-green-600'
                  : stage.status === 'in_progress' ? 'text-blue-600 font-medium'
                  : 'text-gray-400';
                
                return (
                  <div key={index} className={`flex items-center ${color}`}>
                    <span className="mr-2">{icon}</span>
                    <span>{stage.stageName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Deliverables</h3>
            {job.deliverables.length === 0 ? (
              <p className="text-gray-600">
                Deliverables will appear here as they are completed.
              </p>
            ) : (
              <div className="space-y-2">
                {job.deliverables.map((asset, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                    <div>
                      <p className="font-medium">{asset.filename}</p>
                      <p className="text-xs text-gray-500">{asset.type}</p>
                    </div>
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Project Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Project Type</p>
              <p className="font-medium">{job.projectType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vertical</p>
              <p className="font-medium">{job.vertical.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-medium">{new Date(job.createdAt).toLocaleDateString()}</p>
            </div>
            {job.budgetCents && (
              <div>
                <p className="text-sm text-gray-600">Budget</p>
                <p className="font-medium">${(job.budgetCents / 100).toFixed(2)}</p>
              </div>
            )}
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
