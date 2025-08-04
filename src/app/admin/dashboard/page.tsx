"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminStats {
  totalCases: number;
  pendingCases: number;
  activeCases: number;
  resolvedCases: number;
  unresolvedCases: number;
  totalUsers: number;
  resolutionRate: number;
}

interface Case {
  id: string;
  caseNumber: string;
  caseType: string;
  issueDescription: string;
  status: string;
  priority: string;
  createdAt: string;
  complainant: {
    id: string;
    name: string;
    email: string;
  };
  respondent?: {
    id: string;
    name: string;
    email: string;
  };
  evidence: any[];
  mediationPanel?: {
    id: string;
    createdAt: string;
  };
  _count: {
    witnesses: number;
    notifications: number;
    caseHistory: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    totalCases: 0,
    pendingCases: 0,
    activeCases: 0,
    resolvedCases: 0,
    unresolvedCases: 0,
    totalUsers: 0,
    resolutionRate: 0,
  });
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/auth/login");
      return;
    }

    const user = JSON.parse(userData);
    // Check if user is admin by role
    if (user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    fetchDashboardData(token);
  }, [router]);

  const fetchDashboardData = async (token: string) => {
    setLoading(true);
    try {
      console.log("Fetching admin dashboard data..."); // Debug log
      
      const [dashboardResponse, casesResponse] = await Promise.all([
        fetch("http://localhost:3001/api/admin/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:3001/api/admin/cases", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      console.log("Dashboard response status:", dashboardResponse.status); // Debug log
      console.log("Cases response status:", casesResponse.status); // Debug log

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        console.log("Dashboard data:", dashboardData); // Debug log
        setStats(dashboardData.statistics);
      } else {
        console.error("Dashboard fetch failed:", await dashboardResponse.text());
      }

      if (casesResponse.ok) {
        const casesData = await casesResponse.json();
        console.log("Admin cases data:", casesData); // Debug log
        setCases(casesData.cases || []);
      } else {
        console.error("Failed to fetch cases:", await casesResponse.text());
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCaseStatus = async (
    caseId: string,
    newStatus: string,
    reason?: string
  ) => {
    setStatusUpdateLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/api/admin/cases/${caseId}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus, reason }),
        }
      );

      if (response.ok) {
        // Refresh data
        fetchDashboardData(token!);
        setSelectedCase(null);
      }
    } catch (error) {
      console.error("Error updating case status:", error);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "AWAITING_RESPONSE":
        return "bg-blue-100 text-blue-800";
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      case "WITNESSES_NOMINATED":
        return "bg-purple-100 text-purple-800";
      case "PANEL_CREATED":
        return "bg-indigo-100 text-indigo-800";
      case "MEDIATION_IN_PROGRESS":
        return "bg-orange-100 text-orange-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "UNRESOLVED":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-gray-100 text-gray-800";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "URGENT":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">ResolveIt</h1>
              <span className="ml-4 text-gray-500">Admin Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                User Dashboard
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  router.push("/");
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("cases")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "cases"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Case Management
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "users"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              User Management
            </button>
          </nav>
        </div>

        {activeTab === "overview" && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Cases
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalCases}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Pending
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.pendingCases}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Active
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.activeCases}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Resolved
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.resolvedCases}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Users
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.totalUsers}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Success Rate
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.resolutionRate}%
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Cases */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Cases
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {cases.slice(0, 10).map((case_) => (
                  <div key={case_.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-indigo-600">
                            #{case_.caseNumber}
                          </p>
                          <span
                            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              case_.status
                            )}`}
                          >
                            {case_.status.replace("_", " ")}
                          </span>
                          <span
                            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                              case_.priority
                            )}`}
                          >
                            {case_.priority}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-900">
                          {case_.caseType} -{" "}
                          {case_.issueDescription.substring(0, 100)}...
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Complainant: {case_.complainant.name} • Created:{" "}
                          {formatDate(case_.createdAt)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex space-x-2">
                        <button
                          onClick={() => setSelectedCase(case_)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "cases" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Case Management
              </h2>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {cases.map((case_) => (
                  <li key={case_.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              Case #{case_.caseNumber}
                            </p>
                            <span
                              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                case_.status
                              )}`}
                            >
                              {case_.status.replace("_", " ")}
                            </span>
                            <span
                              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                                case_.priority
                              )}`}
                            >
                              {case_.priority}
                            </span>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex">
                              <p className="flex items-center text-sm text-gray-500">
                                <span className="font-medium">
                                  {case_.caseType}
                                </span>
                                <span className="mx-2">•</span>
                                <span>
                                  Complainant: {case_.complainant.name}
                                </span>
                                {case_.respondent && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>
                                      Respondent: {case_.respondent.name}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              <p>Created {formatDate(case_.createdAt)}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-900">
                              {case_.issueDescription.substring(0, 200)}...
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <span>
                              {case_.evidence.length} evidence file(s)
                            </span>
                            <span className="mx-2">•</span>
                            <span>{case_._count.witnesses} witness(es)</span>
                            <span className="mx-2">•</span>
                            <span>
                              {case_._count.notifications} notification(s)
                            </span>
                            {case_.mediationPanel && (
                              <>
                                <span className="mx-2">•</span>
                                <span>Panel created</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => setSelectedCase(case_)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Manage →
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Case Management Modal */}
        {selectedCase && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Manage Case #{selectedCase.caseNumber}
                  </h3>
                  <button
                    onClick={() => setSelectedCase(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Current Status
                    </label>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        selectedCase.status
                      )}`}
                    >
                      {selectedCase.status.replace("_", " ")}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Update Status
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "PENDING",
                        "AWAITING_RESPONSE",
                        "ACCEPTED",
                        "WITNESSES_NOMINATED",
                        "PANEL_CREATED",
                        "MEDIATION_IN_PROGRESS",
                        "RESOLVED",
                        "UNRESOLVED",
                        "CANCELLED",
                      ].map((status) => (
                        <button
                          key={status}
                          onClick={() =>
                            updateCaseStatus(selectedCase.id, status)
                          }
                          disabled={
                            statusUpdateLoading ||
                            selectedCase.status === status
                          }
                          className={`px-3 py-2 text-xs font-medium rounded ${
                            selectedCase.status === status
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                          }`}
                        >
                          {status.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Case Details
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Type:</strong> {selectedCase.caseType}
                      </p>
                      <p>
                        <strong>Priority:</strong> {selectedCase.priority}
                      </p>
                      <p>
                        <strong>Complainant:</strong>{" "}
                        {selectedCase.complainant.name} (
                        {selectedCase.complainant.email})
                      </p>
                      {selectedCase.respondent && (
                        <p>
                          <strong>Respondent:</strong>{" "}
                          {selectedCase.respondent.name} (
                          {selectedCase.respondent.email})
                        </p>
                      )}
                      <p>
                        <strong>Evidence Files:</strong>{" "}
                        {selectedCase.evidence.length}
                      </p>
                      <p>
                        <strong>Witnesses:</strong>{" "}
                        {selectedCase._count.witnesses}
                      </p>
                      <p>
                        <strong>Created:</strong>{" "}
                        {formatDate(selectedCase.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Issue Description
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedCase.issueDescription}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedCase(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
