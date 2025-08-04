"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterCase() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    caseType: "",
    issueDescription: "",
    oppositePartyName: "",
    oppositePartyEmail: "",
    oppositePartyPhone: "",
    oppositePartyAddress: "",
    isInCourt: false,
    isInPoliceStation: false,
    courtCaseNumber: "",
    firNumber: "",
    courtName: "",
    policeStationName: "",
    priority: "MEDIUM",
  });

  const [evidence, setEvidence] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  // Common input styling
  const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white placeholder-gray-500";

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEvidence(e.target.files);
  };

  const validateStep1 = () => {
    if (
      !formData.caseType ||
      !formData.issueDescription ||
      !formData.oppositePartyName
    ) {
      setError("Please fill in all required fields");
      return false;
    }
    if (formData.issueDescription.length < 50) {
      setError("Issue description must be at least 50 characters long");
      return false;
    }
    if (formData.issueDescription.length > 2000) {
      setError("Issue description cannot exceed 2000 characters");
      return false;
    }
    if (formData.oppositePartyName.length < 2) {
      setError("Opposite party name must be at least 2 characters long");
      return false;
    }
    if (formData.oppositePartyEmail && !/\S+@\S+\.\S+/.test(formData.oppositePartyEmail)) {
      setError("Please enter a valid email address for opposite party");
      return false;
    }
    setError("");
    return true;
  };

  const validateStep2 = () => {
    if (
      formData.isInCourt &&
      (!formData.courtCaseNumber || !formData.courtName)
    ) {
      setError(
        "Court case number and court name are required when case is in court"
      );
      return false;
    }
    if (
      formData.isInPoliceStation &&
      (!formData.firNumber || !formData.policeStationName)
    ) {
      setError(
        "FIR number and police station name are required when case is with police"
      );
      return false;
    }
    setError("");
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      // Send as JSON (matching our working PowerShell script)
      const caseData = {
        caseType: formData.caseType,
        issueDescription: formData.issueDescription,
        oppositePartyName: formData.oppositePartyName,
        oppositePartyEmail: formData.oppositePartyEmail || undefined,
        oppositePartyPhone: formData.oppositePartyPhone || undefined,
        oppositePartyAddress: formData.oppositePartyAddress || undefined,
        isInCourt: formData.isInCourt,
        isInPoliceStation: formData.isInPoliceStation,
        courtCaseNumber: formData.courtCaseNumber || undefined,
        firNumber: formData.firNumber || undefined,
        courtName: formData.courtName || undefined,
        policeStationName: formData.policeStationName || undefined,
        priority: formData.priority,
      };

      // Remove undefined values to match backend validation
      Object.keys(caseData).forEach(key => {
        if (caseData[key] === undefined || caseData[key] === "") {
          delete caseData[key];
        }
      });

      let response;
      
      // If no files, send JSON; if files exist, use FormData
      if (!evidence || evidence.length === 0) {
        response = await fetch("http://localhost:3001/api/cases", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(caseData),
        });
      } else {
        // Use FormData for file uploads
        const formDataToSend = new FormData();
        
        // Add case data
        formDataToSend.append("caseType", caseData.caseType);
        formDataToSend.append("issueDescription", caseData.issueDescription);
        formDataToSend.append("oppositePartyName", caseData.oppositePartyName);
        formDataToSend.append("isInCourt", caseData.isInCourt.toString());
        formDataToSend.append("isInPoliceStation", caseData.isInPoliceStation.toString());
        formDataToSend.append("priority", caseData.priority);
        
        if (caseData.oppositePartyEmail) formDataToSend.append("oppositePartyEmail", caseData.oppositePartyEmail);
        if (caseData.oppositePartyPhone) formDataToSend.append("oppositePartyPhone", caseData.oppositePartyPhone);
        if (caseData.oppositePartyAddress) formDataToSend.append("oppositePartyAddress", caseData.oppositePartyAddress);
        if (caseData.courtCaseNumber) formDataToSend.append("courtCaseNumber", caseData.courtCaseNumber);
        if (caseData.firNumber) formDataToSend.append("firNumber", caseData.firNumber);
        if (caseData.courtName) formDataToSend.append("courtName", caseData.courtName);
        if (caseData.policeStationName) formDataToSend.append("policeStationName", caseData.policeStationName);
        
        // Add evidence files
        Array.from(evidence).forEach((file) => {
          formDataToSend.append("evidence", file);
        });
        
        response = await fetch("http://localhost:3001/api/cases", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataToSend,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        console.error('Case registration failed:', data);
        throw new Error(data.error || `Case registration failed with status ${response.status}`);
      }

      console.log('Case registered successfully:', data);
      
      // Show success message before redirect
      alert(`Case registered successfully! Case Number: ${data.case.caseNumber}`);

      // Redirect to dashboard instead of case details (since that route might not exist yet)
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred during case registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-2xl font-bold text-indigo-600"
              >
                ResolveIt
              </Link>
              <span className="ml-4 text-gray-500">Register New Case</span>
            </div>
            <Link
              href="/dashboard"
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Register New Dispute Case
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Provide detailed information about your dispute to begin the
              resolution process.
            </p>
          </div>

          <div className="p-6">
            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= 1
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  1
                </div>
                <div
                  className={`w-16 h-1 ${
                    step >= 2 ? "bg-indigo-600" : "bg-gray-200"
                  }`}
                ></div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= 2
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  2
                </div>
                <div
                  className={`w-16 h-1 ${
                    step >= 3 ? "bg-indigo-600" : "bg-gray-200"
                  }`}
                ></div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= 3
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  3
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Case Details</span>
                <span>Legal Status</span>
                <span>Evidence</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="caseType"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Case Type *
                      </label>
                      <select
                        id="caseType"
                        name="caseType"
                        required
                        value={formData.caseType}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                      >
                        <option value="">Select case type</option>
                        <option value="CONTRACT">Contract Dispute</option>
                        <option value="PROPERTY">Property Issue</option>
                        <option value="BUSINESS">Business Conflict</option>
                        <option value="FAMILY">Family Dispute</option>
                        <option value="CRIMINAL">Criminal Matter</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="priority"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Priority Level
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="issueDescription"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Issue Description *
                    </label>
                    <textarea
                      id="issueDescription"
                      name="issueDescription"
                      rows={6}
                      required
                      value={formData.issueDescription}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 bg-white"
                      placeholder="Describe your dispute in detail (minimum 50 characters)..."
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.issueDescription.length}/2000 characters
                      (minimum 50 required)
                    </p>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Opposite Party Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="oppositePartyName"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Opposite Party Name *
                        </label>
                        <input
                          id="oppositePartyName"
                          name="oppositePartyName"
                          type="text"
                          required
                          value={formData.oppositePartyName}
                          onChange={handleInputChange}
                          className={inputClasses}
                          placeholder="Enter opposite party name"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="oppositePartyEmail"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Opposite Party Email
                        </label>
                        <input
                          id="oppositePartyEmail"
                          name="oppositePartyEmail"
                          type="email"
                          value={formData.oppositePartyEmail}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter email if known"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="oppositePartyPhone"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Opposite Party Phone
                        </label>
                        <input
                          id="oppositePartyPhone"
                          name="oppositePartyPhone"
                          type="tel"
                          value={formData.oppositePartyPhone}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter phone if known"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="oppositePartyAddress"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Opposite Party Address
                        </label>
                        <input
                          id="oppositePartyAddress"
                          name="oppositePartyAddress"
                          type="text"
                          value={formData.oppositePartyAddress}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter address if known"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium"
                    >
                      Next: Legal Status
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Legal Proceedings Status
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        id="isInCourt"
                        name="isInCourt"
                        type="checkbox"
                        checked={formData.isInCourt}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="isInCourt"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        This case is currently pending in a court
                      </label>
                    </div>

                    {formData.isInCourt && (
                      <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="courtCaseNumber"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Court Case Number *
                          </label>
                          <input
                            id="courtCaseNumber"
                            name="courtCaseNumber"
                            type="text"
                            value={formData.courtCaseNumber}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Enter court case number"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="courtName"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Court Name *
                          </label>
                          <input
                            id="courtName"
                            name="courtName"
                            type="text"
                            value={formData.courtName}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Enter court name"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      <input
                        id="isInPoliceStation"
                        name="isInPoliceStation"
                        type="checkbox"
                        checked={formData.isInPoliceStation}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="isInPoliceStation"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        This case is registered with police
                      </label>
                    </div>

                    {formData.isInPoliceStation && (
                      <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="firNumber"
                            className="block text-sm font-medium text-gray-700"
                          >
                            FIR Number *
                          </label>
                          <input
                            id="firNumber"
                            name="firNumber"
                            type="text"
                            value={formData.firNumber}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Enter FIR number"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="policeStationName"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Police Station Name *
                          </label>
                          <input
                            id="policeStationName"
                            name="policeStationName"
                            type="text"
                            value={formData.policeStationName}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Enter police station name"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md text-sm font-medium"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium"
                    >
                      Next: Evidence Upload
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Evidence Upload
                  </h3>

                  <div>
                    <label
                      htmlFor="evidence"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Upload Evidence Files (Optional)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="evidence"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            <span>Upload files</span>
                            <input
                              id="evidence"
                              name="evidence"
                              type="file"
                              multiple
                              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                              onChange={handleFileChange}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          Images, videos, audio files, PDF, DOC up to 10MB each
                        </p>
                      </div>
                    </div>
                    {evidence && evidence.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Selected files:</p>
                        <ul className="mt-1 text-sm text-gray-500">
                          {Array.from(evidence).map((file, index) => (
                            <li key={index} className="flex items-center">
                              <span className="truncate">{file.name}</span>
                              <span className="ml-2 text-xs">
                                ({Math.round(file.size / 1024)} KB)
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-yellow-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Evidence Guidelines
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <ul className="list-disc list-inside space-y-1">
                            <li>
                              Upload clear, relevant evidence that supports your
                              case
                            </li>
                            <li>
                              Accepted formats: Images, videos, audio, PDF, DOC
                              files
                            </li>
                            <li>Maximum file size: 10MB per file</li>
                            <li>You can upload multiple files at once</li>
                            <li>
                              Evidence can be added later from the case details
                              page
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md text-sm font-medium"
                    >
                      Previous
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Registering Case..." : "Register Case"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
