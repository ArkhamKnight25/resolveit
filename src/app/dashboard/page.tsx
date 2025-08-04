"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Case {
  id: string;
  caseNumber: string;
  caseType: string;
  issueDescription: string;
  status: string;
  priority: string;
  createdAt: string;
  complainant: User;
  respondent?: User;
  oppositePartyName?: string;
  oppositePartyEmail?: string;
  evidence: any[];
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalCases: 0,
    pendingCases: 0,
    activeCases: 0,
    resolvedCases: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/auth/login");
      return;
    }

    setUser(JSON.parse(userData));
    fetchCases(token);
  }, [router]);

  const fetchCases = async (token: string) => {
    try {
      const response = await fetch("http://localhost:3001/api/cases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch cases");
      }

      const data = await response.json();
      setCases(data.cases);

      // Calculate stats
      const total = data.cases.length;
      const pending = data.cases.filter(
        (c: Case) => c.status === "PENDING"
      ).length;
      const active = data.cases.filter((c: Case) =>
        [
          "AWAITING_RESPONSE",
          "ACCEPTED",
          "WITNESSES_NOMINATED",
          "PANEL_CREATED",
          "MEDIATION_IN_PROGRESS",
        ].includes(c.status)
      ).length;
      const resolved = data.cases.filter(
        (c: Case) => c.status === "RESOLVED"
      ).length;

      setStats({
        totalCases: total,
        pendingCases: pending,
        activeCases: active,
        resolvedCases: resolved,
      });
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
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
              <span className="ml-4 text-gray-500">Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
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
              My Cases
            </button>
          </nav>
        </div>

        {activeTab === "overview" && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                          Pending Cases
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
                          Active Cases
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
                          Resolved Cases
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {stats.resolvedCases}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/dashboard/register-case"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md text-center font-medium transition-colors"
                >
                  Register New Case
                </Link>
                <Link
                  href="/dashboard/cases"
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-md text-center font-medium transition-colors"
                >
                  View All Cases
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-md text-center font-medium transition-colors"
                >
                  Update Profile
                </Link>
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
                {cases.slice(0, 5).map((case_) => (
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
                        </div>
                        <p className="mt-1 text-sm text-gray-900">
                          {case_.caseType} -{" "}
                          {case_.issueDescription.substring(0, 100)}...
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Created on {formatDate(case_.createdAt)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Link
                          href={`/dashboard/cases/${case_.id}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                {cases.length === 0 && (
                  <div className="px-6 py-4 text-center text-gray-500">
                    No cases found.{" "}
                    <Link
                      href="/dashboard/register-case"
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Register your first case
                    </Link>
                    .
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "cases" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Cases</h2>
              <Link
                href="/dashboard/register-case"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Register New Case
              </Link>
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
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex">
                              <p className="flex items-center text-sm text-gray-500">
                                <span className="font-medium">
                                  {case_.caseType}
                                </span>
                                <span className="mx-2">•</span>
                                <span>Priority: {case_.priority}</span>
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
                              Opposite Party:{" "}
                              {case_.respondent?.name ||
                                case_.oppositePartyName}
                            </span>
                            {case_.evidence.length > 0 && (
                              <>
                                <span className="mx-2">•</span>
                                <span>
                                  {case_.evidence.length} evidence file(s)
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Link
                            href={`/dashboard/cases/${case_.id}`}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {cases.length === 0 && (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No cases
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by registering your first case.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/dashboard/register-case"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Register New Case
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
