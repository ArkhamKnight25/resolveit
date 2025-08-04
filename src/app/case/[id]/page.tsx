"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Evidence {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
}

interface Witness {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship: string;
  statement?: string;
  createdAt: string;
}

interface CaseHistory {
  id: string;
  action: string;
  description: string;
  performedBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface Case {
  id: string;
  caseNumber: string;
  caseType: string;
  issueDescription: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  complainant: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  respondent?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  evidence: Evidence[];
  witnesses: Witness[];
  caseHistory: CaseHistory[];
  mediationPanel?: {
    id: string;
    createdAt: string;
    mediators: Array<{
      id: string;
      name: string;
      email: string;
    }>;
  };
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    createdAt: string;
  }>;
}

export default function CaseDetails() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [case_, setCase] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [respondResponse, setRespondResponse] = useState("");
  const [respondLoading, setRespondLoading] = useState(false);
  const [addWitnessForm, setAddWitnessForm] = useState({
    name: "",
    email: "",
    phone: "",
    relationship: "",
    statement: "",
  });
  const [witnessLoading, setWitnessLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    fetchCaseDetails(token);
  }, [caseId, router]);

  const fetchCaseDetails = async (token: string) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/cases/${caseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCase(data.case);
      } else {
        console.error("Failed to fetch case details");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching case details:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToCase = async () => {
    if (!respondResponse.trim()) return;

    setRespondLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/api/cases/${caseId}/respond`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ response: respondResponse }),
        }
      );

      if (response.ok) {
        setRespondResponse("");
        fetchCaseDetails(token!);
      }
    } catch (error) {
      console.error("Error responding to case:", error);
    } finally {
      setRespondLoading(false);
    }
  };

  const handleAddWitness = async () => {
    if (
      !addWitnessForm.name ||
      !addWitnessForm.email ||
      !addWitnessForm.relationship
    )
      return;

    setWitnessLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3001/api/cases/${caseId}/witnesses`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(addWitnessForm),
        }
      );

      if (response.ok) {
        setAddWitnessForm({
          name: "",
          email: "",
          phone: "",
          relationship: "",
          statement: "",
        });
        fetchCaseDetails(token!);
      }
    } catch (error) {
      console.error("Error adding witness:", error);
    } finally {
      setWitnessLoading(false);
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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const downloadEvidence = (evidence: Evidence) => {
    // In a real application, this would download the file
    window.open(`http://localhost:3001/uploads/${evidence.fileName}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (!case_) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Case not found</h2>
          <p className="mt-2 text-gray-600">
            The case you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md"
          >
            Back to Dashboard
          </Link>
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
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-indigo-600 hover:text-indigo-800"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Case #{case_.caseNumber}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  case_.status
                )}`}
              >
                {case_.status.replace("_", " ")}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                  case_.priority
                )}`}
              >
                {case_.priority}
              </span>
            </div>
            <div className="flex items-center space-x-4">
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
        {/* Case Overview */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Case Information
                </h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Case Type
                    </dt>
                    <dd className="text-sm text-gray-900">{case_.caseType}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Created
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {formatDate(case_.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Last Updated
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {formatDate(case_.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Parties Involved
                </h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Complainant
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {case_.complainant.name} ({case_.complainant.email})
                      {case_.complainant.phone && <br />}
                      {case_.complainant.phone}
                    </dd>
                  </div>
                  {case_.respondent && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Respondent
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {case_.respondent.name} ({case_.respondent.email})
                        {case_.respondent.phone && <br />}
                        {case_.respondent.phone}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Issue Description
              </h3>
              <p className="text-sm text-gray-700">{case_.issueDescription}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
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
              onClick={() => setActiveTab("evidence")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "evidence"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Evidence ({case_.evidence.length})
            </button>
            <button
              onClick={() => setActiveTab("witnesses")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "witnesses"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Witnesses ({case_.witnesses.length})
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "timeline"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Timeline
            </button>
            {case_.status === "AWAITING_RESPONSE" && (
              <button
                onClick={() => setActiveTab("respond")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "respond"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Respond
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Case Statistics
                </h3>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Evidence Files
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {case_.evidence.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Witnesses
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {case_.witnesses.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Timeline Events
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {case_.caseHistory.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Notifications
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {case_.notifications.length}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {case_.mediationPanel && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Mediation Panel
                  </h3>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Panel created on{" "}
                    {formatDate(case_.mediationPanel.createdAt)}
                  </p>
                  <div className="space-y-2">
                    {case_.mediationPanel.mediators.map((mediator) => (
                      <div key={mediator.id} className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-indigo-600">
                            {mediator.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {mediator.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {mediator.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Evidence Files
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {case_.evidence.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No evidence files uploaded yet.
                </div>
              ) : (
                case_.evidence.map((evidence) => (
                  <div key={evidence.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                          <svg
                            className="w-6 h-6 text-gray-600"
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
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {evidence.fileName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {evidence.fileType} •{" "}
                            {formatFileSize(evidence.fileSize)} • Uploaded{" "}
                            {formatDate(evidence.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadEvidence(evidence)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "witnesses" && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Witnesses</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {case_.witnesses.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No witnesses added yet.
                  </div>
                ) : (
                  case_.witnesses.map((witness) => (
                    <div key={witness.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                            <span className="text-sm font-medium text-indigo-600">
                              {witness.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {witness.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {witness.email}
                            </p>
                            {witness.phone && (
                              <p className="text-sm text-gray-500">
                                {witness.phone}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Relationship:</span>{" "}
                              {witness.relationship}
                            </p>
                            {witness.statement && (
                              <p className="text-sm text-gray-600 mt-2">
                                <span className="font-medium">Statement:</span>{" "}
                                {witness.statement}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Added {formatDate(witness.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Witness Form */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Add Witness
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={addWitnessForm.name}
                      onChange={(e) =>
                        setAddWitnessForm({
                          ...addWitnessForm,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter witness name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={addWitnessForm.email}
                      onChange={(e) =>
                        setAddWitnessForm({
                          ...addWitnessForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter witness email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={addWitnessForm.phone}
                      onChange={(e) =>
                        setAddWitnessForm({
                          ...addWitnessForm,
                          phone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter witness phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship *
                    </label>
                    <input
                      type="text"
                      value={addWitnessForm.relationship}
                      onChange={(e) =>
                        setAddWitnessForm({
                          ...addWitnessForm,
                          relationship: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Friend, Colleague, Family"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statement
                    </label>
                    <textarea
                      value={addWitnessForm.statement}
                      onChange={(e) =>
                        setAddWitnessForm({
                          ...addWitnessForm,
                          statement: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter witness statement or description"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleAddWitness}
                    disabled={
                      witnessLoading ||
                      !addWitnessForm.name ||
                      !addWitnessForm.email ||
                      !addWitnessForm.relationship
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {witnessLoading ? "Adding..." : "Add Witness"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Case Timeline
              </h3>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {case_.caseHistory.map((event, eventIdx) => (
                    <li key={event.id}>
                      <div className="relative pb-8">
                        {eventIdx !== case_.caseHistory.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                              <svg
                                className="h-5 w-5 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                <span className="font-medium text-gray-900">
                                  {event.action}
                                </span>
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {event.description}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                by {event.performedBy.name}
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {formatDate(event.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === "respond" && case_.status === "AWAITING_RESPONSE" && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Respond to Case
              </h3>
              <p className="text-sm text-gray-600">
                Provide your response to this case.
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Response
                  </label>
                  <textarea
                    value={respondResponse}
                    onChange={(e) => setRespondResponse(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter your detailed response to this case..."
                  />
                </div>
                <div>
                  <button
                    onClick={handleRespondToCase}
                    disabled={respondLoading || !respondResponse.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md text-sm font-medium"
                  >
                    {respondLoading ? "Submitting..." : "Submit Response"}
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
