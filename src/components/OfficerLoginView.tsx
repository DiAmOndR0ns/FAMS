import React, { useState } from "react";
import { Lock, User as UserIcon, ArrowLeft, ShieldCheck, AlertCircle, Users, CheckCircle2 } from "lucide-react";
import { User, Member } from "../types";

interface OfficerLoginViewProps {
  onLogin: (username: string, password: string, mfaCode?: string) => Promise<{ success: boolean; mfaRequired?: boolean; message?: string }>;
  onMemberLogin: (memberIdOrName: string) => void;
  onBackToGuest: () => void;
  authError: string;
  isOnline: boolean;
  members: Member[];
  initialTab?: "member" | "officer";
}

export default function OfficerLoginView({
  onLogin,
  onMemberLogin,
  onBackToGuest,
  authError,
  isOnline,
  members,
  initialTab = "member"
}: OfficerLoginViewProps) {
  const [loginTab, setLoginTab] = useState<"member" | "officer">(initialTab);
  
  // Officer state variables
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localOfficerError, setLocalOfficerError] = useState("");
  
  // Forgot Password recovery states
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryOption, setRecoveryOption] = useState<"email" | "admin">("email");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"request" | "verify">("request");
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [simulatedCode, setSimulatedCode] = useState("");
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState("");

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalOfficerError("");
    setRecoverySuccessMsg("");
    setSimulatedCode("");

    if (!recoveryUsername.trim()) {
      setLocalOfficerError("Please enter your username handle.");
      return;
    }

    if (recoveryOption === "email" && !recoveryEmail.trim()) {
      setLocalOfficerError("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: recoveryUsername,
          option: recoveryOption,
          email: recoveryEmail
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setRecoverySuccessMsg(data.message);
        if (recoveryOption === "email") {
          setRecoveryStep("verify");
          if (data.code) {
            setSimulatedCode(data.code);
          }
        }
      } else {
        setLocalOfficerError(data.message || "Failed to submit recovery request.");
      }
    } catch (err: any) {
      setLocalOfficerError(err?.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalOfficerError("");
    setRecoverySuccessMsg("");

    if (!recoveryCodeInput.trim() || !newPasswordInput.trim()) {
      setLocalOfficerError("Please provide both verification code and a new complex password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/verify-and-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: recoveryUsername,
          code: recoveryCodeInput,
          newPassword: newPasswordInput
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setRecoverySuccessMsg(data.message);
        setRecoveryCodeInput("");
        setNewPasswordInput("");
        setSimulatedCode("");
      } else {
        setLocalOfficerError(data.message || "Reset rejected.");
      }
    } catch (err: any) {
      setLocalOfficerError(err?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };
  
  // MFA additionals
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  // Member state variables
  const [memberIdOrName, setMemberIdOrName] = useState("");
  const [localMemberError, setLocalMemberError] = useState("");

  const OFFICERS = [
    {
      role: "President",
      name: "Zenaida A. Elbiña",
      username: "president",
      passwordHint: "p123",
      module: "Oversight, Audits Approval & Task Delegation",
      badgeColor: "bg-teal-50 border-teal-200 text-teal-800",
      iconText: "ZE"
    },
    {
      role: "Vice President",
      name: "Anselna B Arnado",
      username: "vicepresident",
      passwordHint: "v123",
      module: "Governance Tracking & Read-Only Delegation requests",
      badgeColor: "bg-blue-50 border-blue-200 text-blue-800",
      iconText: "AA"
    },
    {
      role: "Secretary",
      name: "Jennylyn S Lumactao",
      username: "secretary",
      passwordHint: "s123",
      module: "Members Roster Ledger, Assembly Deliberation & Minutes Logs",
      badgeColor: "bg-emerald-50 border-emerald-200 text-emerald-800",
      iconText: "JL"
    },
    {
      role: "Treasurer",
      name: "Gracelyn P Asendiente",
      username: "treasurer",
      passwordHint: "t123",
      module: "Direct Cash Book Ledger, Fee Collections & Budget Expensing",
      badgeColor: "bg-amber-50 border-amber-200 text-amber-800",
      iconText: "GA"
    },
    {
      role: "Auditor",
      name: "Lorena B Pinote",
      username: "auditor",
      passwordHint: "a123",
      module: "Financial Evaluation, Balance Verification & Oversight Reports",
      badgeColor: "bg-purple-50 border-purple-200 text-purple-800",
      iconText: "LP"
    },
    {
      role: "PIO",
      name: "Ida S Manera",
      username: "pio",
      passwordHint: "pio123",
      module: "Public Bulletins Publishing & Cooperative Catalog Showroom",
      badgeColor: "bg-indigo-50 border-indigo-200 text-indigo-800",
      iconText: "IM"
    }
  ];

  const MEMBER_PRESETS = [
    { id: "M-1001", name: "Juan Dela Cruz", crop: "Sugarcane" },
    { id: "M-1002", name: "Silvestra S. Simbajon", crop: "Coffee" },
    { id: "M-1003", name: "Diosdada M. Asendiente", crop: "Corn" },
    { id: "M-1004", name: "Mirasol E. Tan", crop: "Vegetables" },
    { id: "M-1005", name: "Romalina S. Evero", crop: "Sugarcane" }
  ];

  const handleSelectOfficerPreset = (officer: typeof OFFICERS[0]) => {
    setSelectedRole(officer.role);
    setUsername(officer.username);
    setPassword(officer.passwordHint);
    setLocalOfficerError("");
    setMfaRequired(false);
    setMfaCode("");
  };

  const handleSelectMemberPreset = (preset: typeof MEMBER_PRESETS[0]) => {
    setMemberIdOrName(preset.id);
    setLocalMemberError("");
  };

  const handleOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalOfficerError("");
    
    if (!username.trim() || !password.trim()) {
      setLocalOfficerError("Please enter both username and passwords.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await onLogin(username, password, mfaRequired ? mfaCode : undefined);
      if (res && res.mfaRequired) {
        setMfaRequired(true);
        setLocalOfficerError("");
      } else if (res && !res.success) {
        setLocalOfficerError(res.message || "Invalid authentication credentials.");
      }
    } catch (err: any) {
      setLocalOfficerError(err?.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalMemberError("");
    const cleanedQuery = memberIdOrName.trim().toLowerCase();
    
    if (!cleanedQuery) {
      setLocalMemberError("Please type either your registered Name or your Farmer ID.");
      return;
    }

    // Verify against live database of members
    const matched = members.find(m => 
      m.id.toLowerCase() === cleanedQuery || 
      m.name.toLowerCase() === cleanedQuery ||
      m.name.toLowerCase().includes(cleanedQuery)
    );

    if (matched) {
      onMemberLogin(matched.id);
    } else {
      setLocalMemberError("We could not locate this name or ID in the association rosters. Please check spelling or test a Quick Preset button.");
    }
  };

  return (
    <div id="unified-login-portal-screen" className="min-h-screen bg-stone-100 flex flex-col justify-between selection:bg-emerald-250">
      
      {/* Portal Header */}
      <header className="bg-emerald-950 text-stone-100 px-6 py-4 shadow-sm border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToGuest}
              className="hover:bg-emerald-90/85 text-stone-200 p-2 rounded-full transition cursor-pointer"
              title="Return to Public Hub"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-md font-sans font-bold tracking-tight">Alegria Farmers Association</h1>
              <p className="text-[10px] text-emerald-300 font-mono">FAMS Integrated Access Portal Gate</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-amber-400 animate-ping"}`} />
            <span className="text-[10px] font-mono text-stone-300">
              {isOnline ? "Server REST Connected" : "Local Database Offline Mode"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Column Switch Grid */}
      <main className="max-w-5xl mx-auto w-full p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-5 gap-8 items-start mt-4">
        
        {/* Left Side: Dynamic Instruction Context depending on selected login track */}
        <div className="lg:col-span-3 space-y-6">
          <div>
            <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-widest block mb-1">
              Select Your Access Portal
            </span>
            <h2 className="text-2xl font-bold font-sans text-stone-900 tracking-tight">
              Alegria Farmers Association Governance Gate
            </h2>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              To preserve local record transparency and fulfill public monitoring requests, FAMS divides access into clear, audited tiers. Select your target portal below to proceed.
            </p>
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex bg-stone-200 p-1.5 rounded-xl border gap-2 font-bold text-xs select-none shadow-inner">
            <button
              type="button"
              onClick={() => { setLoginTab("member"); setLocalMemberError(""); }}
              className={`flex-1 py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loginTab === "member"
                  ? "bg-white text-emerald-900 shadow-sm border border-stone-100"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <Users size={15} /> Active Association Member
            </button>
            
            <button
              type="button"
              onClick={() => { setLoginTab("officer"); setLocalOfficerError(""); }}
              className={`flex-1 py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loginTab === "officer"
                  ? "bg-white text-emerald-900 shadow-sm border border-stone-100"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <Lock size={15} /> Administrative Officers
            </button>
          </div>

          {/* Tab 1 Description: Member Access presets */}
          {loginTab === "member" && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="bg-white border rounded-xl p-5 shadow-xs">
                <h3 className="font-extrabold text-stone-900 text-sm mb-1">Testing Member Verification</h3>
                <p className="text-stone-500 leading-relaxed">
                  Active association members don't require passwords. Simply search or verify yourself using your registered name or ID card number. To test immediately, click any of the active farmer roster presets below:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {MEMBER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectMemberPreset(preset)}
                      className={`text-left p-3 rounded-lg border bg-stone-50 hover:bg-emerald-50 hover:border-emerald-500 transition-all flex justify-between items-center cursor-pointer ${
                        memberIdOrName === preset.id ? "ring-2 ring-emerald-600/35 border-emerald-500 bg-emerald-50/50" : "border-stone-200"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-stone-850 font-sans">{preset.name}</p>
                        <p className="font-mono text-[10px] text-stone-400">ID: <span className="font-bold text-emerald-800">{preset.id}</span></p>
                      </div>
                      <span className="text-[10px] uppercase font-mono text-emerald-800 font-bold bg-emerald-100 border border-emerald-250 px-2 py-0.5 rounded-full">
                        {preset.crop}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2 Description: Officer Access presets */}
          {loginTab === "officer" && (
            <div className="space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OFFICERS.map((off) => (
                  <button
                    key={off.role}
                    type="button"
                    onClick={() => handleSelectOfficerPreset(off)}
                    className={`text-left p-3.5 rounded-lg border bg-white shadow-xs hover:shadow-md transition-all flex gap-3 items-start group cursor-pointer ${
                      selectedRole === off.role 
                        ? "border-emerald-600 ring-2 ring-emerald-600/20" 
                        : "border-stone-200 hover:border-emerald-400"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-mono font-bold text-xs text-stone-800 shrink-0 ${
                      selectedRole === off.role ? "bg-emerald-850 text-white" : "bg-stone-150 bg-stone-100 group-hover:bg-emerald-50"
                    }`}>
                      {off.iconText}
                    </div>
                    <div className="space-y-0.5 text-xs font-sans">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-stone-900">{off.role}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold whitespace-nowrap ${off.badgeColor}`}>
                          {off.name.split(" ")[0]}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-snug font-medium pt-1 border-t border-dashed border-stone-100 mt-1">
                        {off.module}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Active Input Form depending on selection */}
        <div className="lg:col-span-2">
          
          {/* TAB 1 FORM: Member verification */}
          {loginTab === "member" && (
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="text-center pb-4 border-b border-stone-100">
                <div className="bg-emerald-50 text-emerald-800 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <Users size={20} />
                </div>
                <h3 className="font-extrabold text-stone-900 text-lg">Member Verification</h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">Roster Ledger Matching Desk</p>
              </div>

              {localMemberError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex gap-2 items-start text-xs text-rose-950 font-sans">
                  <AlertCircle className="text-rose-700 shrink-0 mt-0.5 animate-bounce" size={15} />
                  <div>
                    <p className="font-bold">Roster Record Match Failed</p>
                    <p>{localMemberError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleMemberSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-stone-700 block">Enter Registered Name or Farmer ID</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                      <UserIcon size={14} />
                    </div>
                    <input
                      type="text"
                      required
                      value={memberIdOrName}
                      onChange={(e) => {
                        setMemberIdOrName(e.target.value);
                        setLocalMemberError("");
                      }}
                      placeholder="e.g. M-1001 or Juan Dela Cruz"
                      className="w-full bg-stone-50 border border-stone-300 rounded-md pl-9 p-3 text-xs text-stone-900 font-sans outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-stone-50 text-xs font-bold py-3 px-4 rounded-md transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck size={14} /> Verify & Access Member Portal
                </button>
              </form>

              <div className="border-t border-stone-100 pt-4 text-center">
                <button
                  type="button"
                  onClick={onBackToGuest}
                  className="text-stone-500 hover:text-stone-950 font-sans font-semibold text-xs transition cursor-pointer"
                >
                  ← Back to Public Hub View
                </button>
              </div>
            </div>
          )}

          {/* TAB 2 FORM: Officer password authentication */}
          {loginTab === "officer" && (
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="text-center pb-4 border-b border-stone-100">
                <div className="bg-emerald-50 text-emerald-800 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <Lock size={20} />
                </div>
                <h3 className="font-extrabold text-stone-900 text-lg">Officer Authentication</h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">Role Sovereignty Verification</p>
              </div>

              {(authError || localOfficerError) && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex gap-2.5 items-start text-xs text-rose-950 font-sans">
                  <AlertCircle className="text-rose-700 shrink-0 mt-0.5" size={15} />
                  <div>
                    <p className="font-bold">Access Verification Refused</p>
                    <p>{localOfficerError || authError}</p>
                  </div>
                </div>
              )}              {recoveryMode ? (
                <div className="space-y-4 animate-fade-in text-xs font-sans">
                  <div className="flex items-center justify-between border-b pb-2 border-stone-100">
                    <span className="font-extrabold text-stone-850 text-xs uppercase tracking-wide flex items-center gap-1">
                      🛡️ Account Recovery System
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryMode(false);
                        setLocalOfficerError("");
                        setRecoverySuccessMsg("");
                      }}
                      className="text-emerald-800 hover:text-emerald-950 text-xs font-bold font-sans transition hover:underline cursor-pointer"
                    >
                      ← Back to Login
                    </button>
                  </div>

                  {recoverySuccessMsg && (
                    <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-lg p-3 text-xs leading-normal font-sans">
                      <p className="font-extrabold text-emerald-900 flex items-center gap-1">✓ Request Handled Successfully</p>
                      <p className="mt-1 font-medium">{recoverySuccessMsg}</p>
                      {simulatedCode && (
                        <div className="mt-2.5 p-2 bg-emerald-100 border border-emerald-200 rounded font-mono text-center">
                          <span className="text-[10px] text-emerald-800 block font-bold uppercase tracking-wider mb-0.5">Development Evaluation Bypass Key</span>
                          <span className="text-sm font-extrabold tracking-widest text-emerald-950">{simulatedCode}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {recoveryStep === "request" ? (
                    <form onSubmit={handleRequestRecovery} className="space-y-4">
                      {/* Sub-tab chooser */}
                      <div className="grid grid-cols-2 bg-stone-100 p-1 rounded-lg border gap-1 select-none text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setRecoveryOption("email")}
                          className={`py-2 px-1 rounded transition-all text-center cursor-pointer ${
                            recoveryOption === "email"
                              ? "bg-white text-emerald-900 shadow-sm border border-stone-200"
                              : "text-stone-500 hover:text-stone-900"
                          }`}
                        >
                          Registered Email
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecoveryOption("admin")}
                          className={`py-2 px-1 rounded transition-all text-center cursor-pointer ${
                            recoveryOption === "admin"
                              ? "bg-white text-emerald-900 shadow-sm border border-stone-200"
                              : "text-stone-500 hover:text-stone-900"
                          }`}
                        >
                          President Intervention
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono font-bold text-stone-700 block">Username / Account Handle</label>
                        <input
                          type="text"
                          required
                          value={recoveryUsername}
                          onChange={(e) => {
                            setRecoveryUsername(e.target.value);
                            setLocalOfficerError("");
                          }}
                          placeholder="e.g. treasurer"
                          className="w-full bg-stone-50 border border-stone-300 rounded-md p-2.5 text-xs text-stone-900 font-mono outline-none focus:bg-white focus:border-emerald-600 transition"
                        />
                      </div>

                      {recoveryOption === "email" ? (
                        <div className="space-y-1 animate-fade-in">
                          <div className="flex justify-between items-center">
                            <label className="text-[11px] font-mono font-bold text-stone-700 block">Registered Email Address</label>
                            {recoveryUsername && (
                              <span className="text-[9px] font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 border border-emerald-100 rounded">
                                Hint: {recoveryUsername.toLowerCase().trim() === "vicepresident" ? "romardiamante@gmail.com" : `${recoveryUsername.toLowerCase().trim()}@alegria.gov`}
                              </span>
                            )}
                          </div>
                          <input
                            type="email"
                            required
                            value={recoveryEmail}
                            onChange={(e) => {
                              setRecoveryEmail(e.target.value);
                              setLocalOfficerError("");
                            }}
                            placeholder="e.g. treasurer@alegria.gov"
                            className="w-full bg-stone-50 border border-stone-300 rounded-md p-2.5 text-xs text-stone-900 font-mono outline-none focus:bg-white focus:border-emerald-600 transition"
                          />
                          <p className="text-[9px] text-stone-400 font-mono mt-0.5">The server validates that this matches the official registered email for the officer profile.</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-stone-50 border rounded-lg border-stone-200 text-stone-600 leading-normal text-[11px] animate-fade-in space-y-2 font-medium">
                          <p>
                            ⚔️ <strong>Manual Executive Intervention:</strong> Selecting this option will register a formal lock-out override request in the Alegria Farmers Association database ledger.
                          </p>
                          <p>
                            To complete the override, please contact President Zenaida A. Elbiña to log into her executive suite and manually approve your password recovery petition.
                          </p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-850 hover:bg-emerald-900 disabled:bg-stone-400 text-stone-100 text-xs font-bold py-3 px-4 rounded-md transition shadow flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                      >
                        {loading ? "⌛ Sending Request..." : recoveryOption === "email" ? "✉ Request Secure Email Recovery Code" : "🔑 File Admin Intervention Petition"}
                      </button>
                    </form>
                  ) : (
                    // Step 'verify': Verification code of Email reset
                    <form onSubmit={handleVerifyReset} className="space-y-4 animate-fade-in">
                      <div className="p-3 bg-teal-50 border rounded-lg border-teal-200 text-teal-950 leading-normal text-[11px] font-medium">
                        Enter the numeric 6-digit recovery code dispatched to your registered email address and define your new 12+ character complex passphrase.
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono font-bold text-stone-700 block">6-Digit Verification Code</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={recoveryCodeInput}
                          onChange={(e) => {
                            setRecoveryCodeInput(e.target.value.replace(/\D/g, ""));
                            setLocalOfficerError("");
                          }}
                          placeholder="e.g. 123456"
                          className="w-full bg-stone-50 border border-stone-300 rounded-md p-2.5 font-mono text-center text-md font-bold text-stone-900 outline-none focus:bg-white focus:border-emerald-600 transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono font-bold text-stone-700 block">New Gate Password</label>
                        <input
                          type="password"
                          required
                          value={newPasswordInput}
                          onChange={(e) => {
                            setNewPasswordInput(e.target.value);
                            setLocalOfficerError("");
                          }}
                          placeholder="At least 12 chars (Upper, Lower, Digit, Special)"
                          className="w-full bg-stone-50 border border-stone-300 rounded-md p-2.5 text-xs text-stone-900 font-mono outline-none focus:bg-white focus:border-emerald-600 transition"
                        />
                        <p className="text-[9px] text-stone-400 font-mono">Password must meet corporate standard complexity guidelines (min length 12).</p>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || recoverySuccessMsg.includes("completed successfully")}
                        className="w-full bg-emerald-850 hover:bg-emerald-950 disabled:bg-stone-400 text-stone-100 text-xs font-bold py-3 px-4 rounded-md transition shadow flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                      >
                        {loading ? "⌛ Re-securing Credentials..." : "🔐 Verify Code and Activate Gate Passphrase"}
                      </button>

                      {recoverySuccessMsg.includes("completed successfully") && (
                        <div className="pt-2 text-center animate-bounce">
                          <button
                            type="button"
                            onClick={() => {
                              setRecoveryMode(false);
                              setLocalOfficerError("");
                              setRecoverySuccessMsg("");
                              setUsername(recoveryUsername);
                            }}
                            className="bg-emerald-900 text-white hover:bg-emerald-950 font-bold px-4 py-2 rounded text-xs transition cursor-pointer"
                          >
                            Proceed to Login Gate Now
                          </button>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              ) : (
                <form onSubmit={handleOfficerSubmit} className="space-y-4">
                  {!mfaRequired ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-mono font-bold text-stone-700 block">Username / Account</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                            <UserIcon size={14} />
                          </div>
                          <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => {
                              setUsername(e.target.value);
                              setLocalOfficerError("");
                            }}
                            placeholder="e.g. secretary"
                            className="w-full bg-stone-50 border border-stone-300 rounded-md pl-9 p-2.5 text-xs text-stone-900 font-mono outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-mono font-bold text-stone-700 block">Gate Password</label>
                          {selectedRole && (
                            <span className="text-[9px] font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 border border-emerald-100 rounded">
                              Hint: {OFFICERS.find(o => o.role === selectedRole)?.passwordHint}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                            <Lock size={14} />
                          </div>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setLocalOfficerError("");
                            }}
                            placeholder="••••••••"
                            className="w-full bg-stone-50 border border-stone-300 rounded-md pl-9 p-2.5 text-xs text-stone-900 font-mono outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRecoveryMode(true);
                              setRecoveryStep("request");
                              setRecoveryUsername(username);
                              setLocalOfficerError("");
                              setRecoverySuccessMsg("");
                            }}
                            className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold hover:underline transition bg-transparent cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3 p-4 bg-emerald-50 rounded-lg border border-emerald-250 animate-fade-in">
                      <p className="text-[11px] text-emerald-900 leading-normal">
                        🛡️ <strong>Dual-Factor MFA Challenge:</strong> Multi-Factor protection is enforced on this profile to satisfy corporate governance guidelines.
                      </p>
                      <div className="space-y-1 mt-2">
                        <label className="text-xs font-mono font-bold text-emerald-900 block">Enter 6-Digit Verification Code</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={mfaCode}
                          onChange={(e) => {
                            setMfaCode(e.target.value.replace(/\D/g, ""));
                            setLocalOfficerError("");
                          }}
                          placeholder="e.g. 123456"
                          className="w-full text-center bg-white border border-emerald-300 rounded-md p-3 text-lg font-mono font-extrabold text-emerald-950 tracking-widest outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition animate-pulse"
                        />
                        <p className="text-[9px] text-emerald-700 font-mono text-center">Default passcode bypass for evaluation: <strong>123456</strong></p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-850 hover:bg-emerald-900 disabled:bg-stone-400 text-stone-100 text-xs font-sans font-extrabold py-3 px-4 rounded-md transition shadow flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">⌛ Authenticating Gate...</span>
                    ) : mfaRequired ? (
                      <>
                        <ShieldCheck size={14} /> Validate Multi-Factor OTP
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} /> Complete Sealed Verification
                      </>
                    )}
                  </button>
                  {mfaRequired && (
                    <button
                      type="button"
                      onClick={() => {
                        setMfaRequired(false);
                        setMfaCode("");
                      }}
                      className="w-full bg-transparent hover:underline text-stone-500 hover:text-stone-700 text-xs py-1 mt-1 text-center font-sans tracking-wide"
                    >
                      ← Back to credential inputs
                    </button>
                  )}
                </form>
              )}

              <div className="border-t border-stone-100 pt-4 text-center">
                <button
                  type="button"
                  onClick={onBackToGuest}
                  className="text-stone-500 hover:text-stone-950 font-sans font-semibold text-xs transition cursor-pointer"
                >
                  ← Back to Transparent Public View
                </button>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* Footer Validation */}
      <footer className="bg-stone-200 border-t border-stone-300 text-center py-4 px-4 text-[10px] text-stone-500 font-mono space-y-0.5 select-none md:flex md:justify-between md:items-center max-w-7xl mx-auto w-full rounded-t-lg">
        <p>© 2026 Barangay Alegria Farmers Association Management System.</p>
        <p className="flex items-center justify-center gap-1 text-emerald-950 font-bold">
          <ShieldCheck size={11} /> SECURE LEVEL VERIFICATION BOUNDARIES ACTIVE
        </p>
      </footer>

    </div>
  );
}
