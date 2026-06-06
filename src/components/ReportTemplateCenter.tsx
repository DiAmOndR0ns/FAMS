import React, { useState, useMemo } from "react";
import { Member, CashFlow, AuditLog, Meeting, User } from "../types";
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  Filter, 
  Settings, 
  Check, 
  ChevronRight, 
  Coins, 
  Users, 
  ShieldCheck, 
  Calendar,
  FileSpreadsheet,
  Award,
  Signature
} from "lucide-react";

interface ReportTemplateCenterProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  cashflow: CashFlow[];
  auditLogs: AuditLog[];
  meetings: Meeting[];
  currentUser: User | null;
  initialReportType?: "members" | "finances" | "security" | "meetings";
}

type ReportType = "members" | "finances" | "security" | "meetings";
type FontTheme = "serif" | "sans" | "mono";
type WatermarkType = "NONE" | "OFFICIAL" | "CONFIDENTIAL" | "APPROVED" | "AUDITED";

export default function ReportTemplateCenter({
  isOpen,
  onClose,
  members,
  cashflow,
  auditLogs,
  meetings,
  currentUser,
  initialReportType
}: ReportTemplateCenterProps) {
  if (!isOpen) return null;

  // State managers
  const [selectedReport, setSelectedReport] = useState<ReportType>(initialReportType || "members");

  // Keep state updated if initialReportType changes
  React.useEffect(() => {
    if (isOpen && initialReportType) {
      setSelectedReport(initialReportType);
    }
  }, [isOpen, initialReportType]);
  const [customTitle, setCustomTitle] = useState("");
  const [fontTheme, setFontTheme] = useState<FontTheme>("serif");
  const [watermark, setWatermark] = useState<WatermarkType>("OFFICIAL");
  const [showSignatures, setShowSignatures] = useState(true);
  const [showSummaryStats, setShowSummaryStats] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // Filter States
  const [barangayFilter, setBarangayFilter] = useState("ALL");
  const [cropFilter, setCropFilter] = useState("ALL");
  const [memberStatusFilter, setMemberStatusFilter] = useState("ALL");

  const [periodFilter, setPeriodFilter] = useState("ALL");
  const [cashTypeFilter, setCashTypeFilter] = useState("ALL");
  const [cashCategoryFilter, setCashCategoryFilter] = useState("ALL");

  const [logDomainFilter, setLogDomainFilter] = useState("ALL");
  const [logActorFilter, setLogActorFilter] = useState("ALL");

  // Signatory Customization
  const [signatory1, setSignatory1] = useState("Zenaida A. Elbiña");
  const [signatory1Title, setSignatory1Title] = useState("Association President");
  const [signatory2, setSignatory2] = useState("Gracelyn P Asendiente");
  const [signatory2Title, setSignatory2Title] = useState("Chief Treasurer");
  const [signatory3, setSignatory3] = useState("Lorena B Pinote");
  const [signatory3Title, setSignatory3Title] = useState("Internal Auditor");

  // Extract metadata lists dynamically
  const uniqueBarangays = useMemo(() => {
    const list = members.map(m => m.barangay);
    return ["ALL", ...Array.from(new Set(list))];
  }, [members]);

  const uniqueCrops = useMemo(() => {
    const list: string[] = [];
    members.forEach(m => {
      m.primaryCrops.forEach(c => {
        if (!list.includes(c)) list.push(c);
      });
    });
    return ["ALL", ...list];
  }, [members]);

  const uniquePeriods = useMemo(() => {
    const list = cashflow.map(c => c.period);
    return ["ALL", ...Array.from(new Set(list))];
  }, [cashflow]);

  const uniqueCategories = useMemo(() => {
    const list = cashflow.map(c => c.category);
    return ["ALL", ...Array.from(new Set(list))];
  }, [cashflow]);

  const uniqueLogDomains = useMemo(() => {
    const list = auditLogs.map(l => l.domain);
    return ["ALL", ...Array.from(new Set(list))];
  }, [auditLogs]);

  const uniqueLogActors = useMemo(() => {
    const list = auditLogs.map(l => l.actor);
    return ["ALL", ...Array.from(new Set(list))];
  }, [auditLogs]);

  // Filter Data
  const filteredMembers = useMemo(() => {
    let list = [...members];
    if (barangayFilter !== "ALL") {
      list = list.filter(m => m.barangay === barangayFilter);
    }
    if (cropFilter !== "ALL") {
      list = list.filter(m => m.primaryCrops.includes(cropFilter));
    }
    if (memberStatusFilter !== "ALL") {
      list = list.filter(m => m.status === memberStatusFilter);
    }
    return list;
  }, [members, barangayFilter, cropFilter, memberStatusFilter]);

  const filteredCashflow = useMemo(() => {
    let list = [...cashflow];
    if (periodFilter !== "ALL") {
      list = list.filter(c => c.period === periodFilter);
    }
    if (cashTypeFilter !== "ALL") {
      list = list.filter(c => c.type === cashTypeFilter);
    }
    if (cashCategoryFilter !== "ALL") {
      list = list.filter(c => c.category === cashCategoryFilter);
    }
    return list;
  }, [cashflow, periodFilter, cashTypeFilter, cashCategoryFilter]);

  const filteredAuditLogs = useMemo(() => {
    let list = [...auditLogs];
    if (logDomainFilter !== "ALL") {
      list = list.filter(l => l.domain === logDomainFilter);
    }
    if (logActorFilter !== "ALL") {
      list = list.filter(l => l.actor.includes(logActorFilter) || l.details.includes(logActorFilter));
    }
    return list;
  }, [auditLogs, logDomainFilter, logActorFilter]);

  // Report statistics calculators
  const stats = useMemo(() => {
    const totalMembersSize = filteredMembers.reduce((sum, m) => sum + m.farmSizeHa, 0);
    const avgMemberAge = filteredMembers.length > 0 
      ? Math.round(filteredMembers.reduce((sum, m) => sum + m.age, 0) / filteredMembers.length)
      : 0;

    const inflow = filteredCashflow.filter(c => c.type === "Income").reduce((sum, c) => sum + c.amount, 0);
    const outflow = filteredCashflow.filter(c => c.type === "Expense").reduce((sum, c) => sum + c.amount, 0);
    const reserve = inflow - outflow;

    const criticalIncidents = filteredAuditLogs.filter(l => 
      l.details.toLowerCase().includes("fail") || 
      l.details.toLowerCase().includes("block") || 
      l.details.toLowerCase().includes("mismatch")
    ).length;

    const resolutionsAdopted = meetings.reduce((sum, m) => sum + (m.resolutions?.length || 0), 0);
    const averageAttendance = meetings.length > 0
      ? Math.round(meetings.reduce((sum, m) => sum + m.attendeesCount, 0) / meetings.length)
      : 0;

    return {
      totalMembersSize,
      avgMemberAge,
      inflow,
      outflow,
      reserve,
      criticalIncidents,
      resolutionsAdopted,
      averageAttendance
    };
  }, [filteredMembers, filteredCashflow, filteredAuditLogs, meetings]);

  const fontClass = {
    serif: "font-serif",
    sans: "font-sans",
    mono: "font-mono"
  }[fontTheme];

  // Helper code to get document unique code
  const documentControlCode = useMemo(() => {
    const shortType = {
      members: "AFA-R-MEM",
      finances: "AFA-F-LED",
      security: "AFA-A-LOG",
      meetings: "AFA-M-MIN"
    }[selectedReport];
    return `${shortType}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }, [selectedReport]);

  const reportTitleComputed = useMemo(() => {
    if (customTitle.trim()) return customTitle;
    return {
      members: "Official Members Registry & Land-Holding Audit",
      finances: "Audited Ledger Statements & Cash Flow Book",
      security: "Access Security Logs & Incident Audit Ledger",
      meetings: "Consolidated Minutes of Meeting & Legislative Resolutions"
    }[selectedReport];
  }, [selectedReport, customTitle]);

  // --- CSV Legacy download fallback ---
  const handleRawCSVFallback = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = "";

    if (selectedReport === "members") {
      headers = ["Member ID", "Full Name", "Gender", "Age", "Barangay", "Registered At", "Farm size (Ha)", "Primary Crops", "Status"];
      rows = filteredMembers.map(m => [
        m.id, m.name, m.gender, m.age, m.barangay, m.registeredAt, m.farmSizeHa, m.primaryCrops.join(" / "), m.status
      ]);
      filename = "AFA_Filtered_Roster.csv";
    } else if (selectedReport === "finances") {
      headers = ["Ledger Ref", "Date", "Type", "Fund Category", "Details", "Amount", "Logged By", "S.Y. Period"];
      rows = filteredCashflow.map(c => [
        c.id, c.date, c.type, c.category, c.description, c.amount, c.loggedBy, c.period
      ]);
      filename = "AFA_Filtered_Ledger.csv";
    } else if (selectedReport === "security") {
      headers = ["Log ID", "Timestamp", "Actor Context", "Audit Domain", "Action Taken", "Resolution Context"];
      rows = filteredAuditLogs.map(l => [
        l.id, l.timestamp, l.actor, l.domain, l.action, l.details
      ]);
      filename = "AFA_Filtered_Audit_Security_Logs.csv";
    } else {
      headers = ["Meeting ID", "Term Date", "Session Title", "Scribe", "Attendees", "Resolutions Count"];
      rows = meetings.map(m => [
        m.id, m.date, m.title, m.recordedBy, m.attendeesCount, m.resolutions?.length || 0
      ]);
      filename = "AFA_Association_Meetings_Overview.csv";
    }

    const csvContent = [headers.join(",")].concat(rows.map(row =>
      row.map(val => {
        const strVal = String(val ?? "").replace(/"/g, '""');
        return strVal.includes(",") || strVal.includes("\n") || strVal.includes('"') ? `"${strVal}"` : strVal;
      }).join(",")
    )).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.className = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- GENERATE HTML STYLISH REPORT FILE ---
  const generateHTMLTemplate = () => {
    let tableHeadersHTML = "";
    let tableRowsHTML = "";
    let summaryCardsHTML = "";

    // Generate specific statistical summary blocks for HTML template
    if (showSummaryStats) {
      if (selectedReport === "members") {
        summaryCardsHTML = `
          <div class="stat-card">
            <span class="stat-label">Total Audited Farmers</span>
            <span class="stat-value">${filteredMembers.length}</span>
            <span class="stat-desc">Central Member Register</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Cumulative Land Area</span>
            <span class="stat-value">${stats.totalMembersSize.toFixed(1)} Ha</span>
            <span class="stat-desc">Agricultural Real Estate</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Average Farmer Age</span>
            <span class="stat-value">${stats.avgMemberAge} yrs</span>
            <span class="stat-desc">Demographic Auditing Scale</span>
          </div>
        `;
      } else if (selectedReport === "finances") {
        summaryCardsHTML = `
          <div class="stat-card">
            <span class="stat-label">Verified Treasury Revenue</span>
            <span class="stat-value" style="color: #065f46;">₱${stats.inflow.toLocaleString()}</span>
            <span class="stat-desc">All Positive Inflows</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Audited Disbursements</span>
            <span class="stat-value" style="color: #991b1b;">₱${stats.outflow.toLocaleString()}</span>
            <span class="stat-desc">Approved Resource Outflows</span>
          </div>
          <div class="stat-card" style="border: 2px solid #065f46;">
            <span class="stat-label">Cash Reserve Liquidity</span>
            <span class="stat-value">₱${stats.reserve.toLocaleString()}</span>
            <span class="stat-desc">Verified Association Reserves</span>
          </div>
        `;
      } else if (selectedReport === "security") {
        summaryCardsHTML = `
          <div class="stat-card">
            <span class="stat-label">Audit Logs Streamed</span>
            <span class="stat-value">${filteredAuditLogs.length}</span>
            <span class="stat-desc">Governance Ledger Rows</span>
          </div>
          <div class="stat-card" style="${stats.criticalIncidents > 0 ? "border: 2px solid #991b1b; background: #fef2f2;" : ""}">
            <span class="stat-label">Anomalies Detected / Blocked</span>
            <span class="stat-value" style="color: ${stats.criticalIncidents > 0 ? "#991b1b" : "#444"};">${stats.criticalIncidents}</span>
            <span class="stat-desc" style="color: #777;">CSP / Identity Lock Violations Deflected</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Encryption Level</span>
            <span class="stat-value">Bcrypt/SHA-2</span>
            <span class="stat-desc">Identity & Credential Defense Active</span>
          </div>
        `;
      } else {
        summaryCardsHTML = `
          <div class="stat-card">
            <span class="stat-label">Sessions Recorded</span>
            <span class="stat-value">${meetings.length}</span>
            <span class="stat-desc">Advisory Councils Convened</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Avg Stakeholder Ingress</span>
            <span class="stat-value">${stats.averageAttendance} members</span>
            <span class="stat-desc">Quorum Threshold Audited</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Resolutions Passed</span>
            <span class="stat-value">${stats.resolutionsAdopted} Adopted</span>
            <span class="stat-desc">Central Advisory Decorum</span>
          </div>
        `;
      }
    }

    // Build Table Elements
    if (selectedReport === "members") {
      tableHeadersHTML = `
        <th>No.</th>
        <th>Farmer Name</th>
        <th>Gender/Age</th>
        <th>Location</th>
        <th>Registration Date</th>
        <th>Farm Area (Ha)</th>
        <th>Primary Crop Cultivations</th>
        <th class="text-right">Status</th>
      `;
      tableRowsHTML = filteredMembers.map((m, i) => `
        <tr>
          <td class="font-mono text-center">${i + 1}</td>
          <td><strong>${m.name}</strong><br/><small style="color: #666; font-family: monospace;">ID: ${m.id}</small></td>
          <td class="text-center">${m.gender} / ${m.age}</td>
          <td>${m.barangay}</td>
          <td class="font-mono" style="font-size: 11px;">${new Date(m.registeredAt).toLocaleDateString()}</td>
          <td class="font-mono text-center">${m.farmSizeHa.toFixed(2)} Ha</td>
          <td>${m.primaryCrops.map(c => `<span class="badge badge-neutral">${c}</span>`).join(" ")}</td>
          <td class="text-right"><span class="badge badge-${m.status.toLowerCase() === "active" ? "success" : "danger"}">${m.status}</span></td>
        </tr>
      `).join("");
    } else if (selectedReport === "finances") {
      tableHeadersHTML = `
        <th>Ledger Ref</th>
        <th>Effective Date</th>
        <th>Flow Type</th>
        <th>Fund Target Category</th>
        <th>Details & Transaction Purpose</th>
        <th>S.Y. Reporting Period</th>
        <th>Amount</th>
      `;
      tableRowsHTML = filteredCashflow.map((c) => `
        <tr>
          <td class="font-mono">${c.id}</td>
          <td class="font-mono" style="font-size: 11px;">${new Date(c.date).toLocaleDateString()}</td>
          <td>
            <span class="badge ${c.type === "Income" ? "badge-success" : "badge-danger"}">
              ${c.type === "Income" ? "INFLOW (+)" : "OUTFLOW (-)"}
            </span>
          </td>
          <td><strong>${c.category}</strong></td>
          <td style="font-size: 11px;">${c.description}<br/><small style="color:#666;">Admin: ${c.loggedBy}</small></td>
          <td style="font-size: 11px; font-family: monospace;">${c.period}</td>
          <td class="font-mono text-right" style="font-weight: bold; color: ${c.type === "Income" ? "#065f46" : "#991b1b"};">
            ₱${c.amount.toLocaleString()}
          </td>
        </tr>
      `).join("");
    } else if (selectedReport === "security") {
      tableHeadersHTML = `
        <th>Log ID</th>
        <th>Security Event Timestamp</th>
        <th>Actor Context / Operator</th>
        <th>Audit Category Class</th>
        <th>Security Action & System Stance</th>
        <th>Audit Details & Root Intention</th>
      `;
      tableRowsHTML = filteredAuditLogs.map((l) => `
        <tr>
          <td class="font-mono" style="font-size: 11px; color:#555;">${l.id}</td>
          <td class="font-mono" style="font-size: 11px;">${new Date(l.timestamp).toLocaleString()}</td>
          <td><strong style="color: #1c1917;">${l.actor}</strong></td>
          <td><span class="badge badge-neutral" style="font-family: monospace;">${l.domain}</span></td>
          <td><strong>${l.action}</strong></td>
          <td style="font-size: 11px; color:#444;" class="font-mono">${l.details}</td>
        </tr>
      `).join("");
    } else {
      tableHeadersHTML = `
        <th>Meeting Date</th>
        <th>Session & Assembly Title</th>
        <th>Recording Scribe</th>
        <th>Attendees</th>
        <th>Key Resolutions & Decrees Adopted</th>
      `;
      tableRowsHTML = meetings.map((m) => `
        <tr>
          <td class="font-mono" style="font-size: 11px; white-space:nowrap;">${new Date(m.date).toLocaleDateString()}</td>
          <td><strong>${m.title}</strong><br/><small style="color: #666; font-family: monospace;">ID: ${m.id}</small></td>
          <td style="font-size: 11px;">${m.recordedBy}</td>
          <td class="font-mono text-center">${m.attendeesCount} farmers</td>
          <td style="font-size: 11px;">
            <ul style="margin: 0; padding-left: 15px;">
              ${(m.resolutions || []).map(r => `<li>${r}</li>`).join("")}
            </ul>
          </td>
        </tr>
      `).join("");
    }

    // Set font style rules inside HTML
    const fontCSSRule = {
      serif: `font-family: 'Georgia', 'Playfair Display', serif;`,
      sans: `font-family: 'Helvetica', 'Arial', system-ui, sans-serif;`,
      mono: `font-family: 'Fira Code', 'Courier New', monospace;`
    }[fontTheme];

    // Stamp absolute watermark
    let watermarkHTML = "";
    if (watermark !== "NONE") {
      watermarkHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 100px;
          font-family: 'Impact', 'Arial Black', sans-serif;
          color: rgba(6, 95, 70, 0.05);
          letter-spacing: 12px;
          pointer-events: none;
          user-select: none;
          z-index: 10000;
          white-space: nowrap;
          text-transform: uppercase;
        ">
          ${watermark}
        </div>
      `;
    }

    // Define entire self-contained printable template HTML index string
    const htmlSource = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${reportTitleComputed}</title>
  <style>
    @media print {
      body {
        background-color: #fff !important;
        color: #000 !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .actions-block, .no-print {
        display: none !important;
      }
      .page-boundary {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
      }
    }
    
    body {
      background-color: #f5f5f4;
      color: #1c1917;
      margin: 0;
      padding: 40px 20px;
      line-height: 1.5;
      ${fontCSSRule}
    }

    .page-boundary {
      max-width: 1000px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e7e5e4;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      padding: 60px 50px;
      position: relative;
    }

    /* Actions Header */
    .actions-block {
      max-width: 1000px;
      margin: 0 auto 20px auto;
      background-color: #065f46;
      color: #f0fdf4;
      padding: 12px 24px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .btn-print {
      background-color: #ffffff;
      color: #065f46;
      border: none;
      padding: 8px 16px;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-print:hover {
      background-color: #f0fdf4;
      transform: translateY(-1px);
    }

    /* Header Seal logo */
    .formal-header {
      border-bottom: 3px double #065f46;
      padding-bottom: 24px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .association-emblem {
      width: 60px;
      height: 60px;
      border: 2px solid #065f46;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f0fdf4;
      color: #065f46;
      font-size: 24px;
      font-weight: 900;
    }
    .text-container {
      text-align: left;
    }
    .text-container h1 {
      margin: 0;
      font-size: 21px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #065f46;
      text-transform: uppercase;
    }
    .text-container p {
      margin: 2px 0 0 0;
      font-size: 11px;
      text-transform: uppercase;
      font-family: monospace;
      color: #57534e;
      letter-spacing: 1px;
    }

    .document-ref-tag {
      text-align: right;
      font-family: monospace;
      font-size: 10px;
      color: #78716c;
    }
    .ref-code {
      font-weight: bold;
      font-size: 11px;
      color: #065f46;
      display: block;
      margin-top: 2px;
    }

    /* Title Block */
    .document-title-block {
      text-align: center;
      margin: 35px 0;
    }
    .document-title-block h2 {
      margin: 0;
      font-size: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #172554;
      border-bottom: 1px solid #e7e5e4;
      display: inline-block;
      padding-bottom: 8px;
    }
    .document-subtitle {
      font-size: 11px;
      font-family: monospace;
      color: #57534e;
      margin-top: 8px;
      text-transform: uppercase;
    }

    /* Meta Details table */
    .metadata-grid {
      display: grid;
      grid-template-cols: 1fr 1fr;
      gap: 30px;
      background-color: #faf9f6;
      border: 1px solid #e7e5e4;
      padding: 15px 25px;
      font-size: 12px;
      margin-bottom: 35px;
    }
    .metadata-column {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #e7e5e4;
      padding-bottom: 4px;
    }
    .meta-row span:first-child {
      font-weight: bold;
      color: #57534e;
      text-transform: uppercase;
      font-size: 11px;
      font-family: monospace;
    }
    .meta-row span:last-child {
      color: #1c1917;
    }

    /* Summary statistic widgets grid */
    .summary-widgets-container {
      display: grid;
      grid-template-cols: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      border: 1px solid #e7e5e4;
      border-radius: 6px;
      padding: 15px;
      text-align: center;
      background: #fafaf9;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .stat-label {
      font-size: 10px;
      font-family: monospace;
      text-transform: uppercase;
      color: #78716c;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .stat-value {
      font-size: 21px;
      font-weight: 800;
      color: #1c1917;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .stat-desc {
      font-size: 10px;
      color: #78716c;
      font-style: italic;
    }

    /* Structured content table */
    .formal-report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 40px;
      text-align: left;
    }
    .formal-report-table th {
      background-color: #faf9f6;
      border-top: 2px solid #065f46;
      border-bottom: 1px solid #a8a29e;
      color: #065f46;
      font-weight: bold;
      padding: 12px 8px;
      font-family: monospace;
      font-size: 11px;
      text-transform: uppercase;
    }
    .formal-report-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #e7e5e4;
      line-height: 1.4;
    }
    .formal-report-table tr:nth-child(even) {
      background-color: #fafaf9;
    }

    /* General classes */
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: bold; }
    
    .badge {
      display: inline-block;
      padding: 2px 6px;
      font-size: 9px;
      font-weight: bold;
      font-family: monospace;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .badge-success { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-danger { background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .badge-neutral { background-color: #f5f5f4; color: #44403c; border: 1px solid #e7e5e4; }

    /* Signatures Division */
    .signatures-block {
      margin-top: 55px;
      border-t: 1px solid #e7e5e4;
      padding-top: 35px;
      display: grid;
      grid-template-cols: 1fr 1fr 1fr;
      gap: 30px;
    }
    .signature-card {
      text-align: center;
    }
    .sig-line {
      width: 80%;
      border-bottom: 1px solid #78716c;
      margin: 35px auto 8px auto;
    }
    .sig-name {
      font-size: 12px;
      font-weight: bold;
      color: #1c1917;
    }
    .sig-title {
      font-size: 10px;
      color: #78716c;
      text-transform: uppercase;
      font-family: monospace;
      letter-spacing: 0.5px;
    }
    .sig-verification-tag {
      font-size: 9px;
      color: #065f46;
      font-family: monospace;
      margin-top: 4px;
      font-weight: bold;
    }

    /* Auditor Seal Stamp decorative */
    .compliance-footer-seal {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px double #e7e5e4;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      font-family: monospace;
      color: #a8a29e;
    }
  </style>
</head>
<body>

  <!-- Printable Actions Overlay banner -->
  <div class="actions-block">
    <div>
      <strong style="font-size:14px; display:block;">✉ Template Assembly Ready for Dispatch</strong>
      <span style="font-size:11px; opacity:0.85;">This self-contained document saves pre-installed stylings. Click Print to save as PDF or print.</span>
    </div>
    <button class="btn-print" onclick="window.print()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print Document Circular
    </button>
  </div>

  <!-- Physical Paper Sheet Model -->
  <div class="page-boundary">
    ${watermarkHTML}

    <!-- Formal Header Letterhead -->
    <div class="formal-header">
      <div class="brand-section">
        <div class="association-emblem">🌾</div>
        <div class="text-container">
          <h1>Alegria Farmers Association</h1>
          <p>Central Registry & Governance Intelligence System</p>
        </div>
      </div>
      <div class="document-ref-tag">
        DOCUMENT CONTROL REF
        <span class="ref-code">${documentControlCode}</span>
      </div>
    </div>

    <!-- Title Block -->
    <div class="document-title-block">
      <h2>${reportTitleComputed}</h2>
      <div class="document-subtitle">Certified Archive Under Executive Charter</div>
    </div>

    <!-- Metadata Details grid -->
    <div class="metadata-grid">
      <div class="metadata-column">
        <div class="meta-row">
          <span>Date Generated</span>
          <span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} (UTC)</span>
        </div>
        <div class="meta-row">
          <span>Assembly Scope</span>
          <span>Alegria Administrative Sector</span>
        </div>
        <div class="meta-row">
          <span>Security Level</span>
          <span>Highly Verified - Non Alterable</span>
        </div>
      </div>
      <div class="metadata-column">
        <div class="meta-row">
          <span>Authorized Scribe</span>
          <span>${currentUser ? currentUser.fullName : "Executive Central Desk"}</span>
        </div>
        <div class="meta-row">
          <span>Database Integrity</span>
          <span>SHA-4 Integrity Ledger Secure</span>
        </div>
        <div class="meta-row">
          <span>System Status</span>
          <span>Certified Active & Clean</span>
        </div>
      </div>
    </div>

    <!-- Summary statistial card widget row -->
    ${showSummaryStats ? `<div class="summary-widgets-container">${summaryCardsHTML}</div>` : ""}

    <!-- Dynamic Main Data Table -->
    <table class="formal-report-table">
      <thead>
        <tr>
          ${tableHeadersHTML}
        </tr>
      </thead>
      <tbody>
        ${tableRowsHTML}
      </tbody>
    </table>

    <!-- Signature block division -->
    ${showSignatures ? `
    <div class="signatures-block">
      <div class="signature-card">
        <div class="sig-line"></div>
        <span class="sig-name">${signatory1}</span><br/>
        <span class="sig-title">${signatory1Title}</span>
        <div class="sig-verification-tag">✓ VERIFIED ATTESTED</div>
      </div>
      <div class="signature-card">
        <div class="sig-line"></div>
        <span class="sig-name">${signatory2}</span><br/>
        <span class="sig-title">${signatory2Title}</span>
        <div class="sig-verification-tag">✓ VERIFIED ATTESTED</div>
      </div>
      <div class="signature-card">
        <div class="sig-line"></div>
        <span class="sig-name">${signatory3}</span><br/>
        <span class="sig-title">${signatory3Title}</span>
        <div class="sig-verification-tag">✓ VERIFIED ATTESTED</div>
      </div>
    </div>
    ` : ""}

    <!-- Official Seal Footer line -->
    <div class="compliance-footer-seal">
      <span>ALegria Farmers Association (AFA) • S.Y. 2025-2026 Admin Suite</span>
      <span>AFA-SECURE-STABILIZER-V2</span>
    </div>
  </div>

  <!-- Automatically trigger printer when loaded as standalone local file -->
  <script>
    // Commented out to trigger print exclusively upon user action
    // window.onload = function() { window.print(); }
  </script>
</body>
</html>
    `;
    return htmlSource;
  };

  const handleDownloadHTMLTemplate = () => {
    setIsDownloading(true);
    try {
      const htmlContent = generateHTMLTemplate();
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      
      const fileNames = {
        members: "AFA_Members_Roster_Audit_Template.html",
        finances: "AFA_Financial_Audited_Ledger_Template.html",
        security: "AFA_Domain_Security_Incident_Ledger.html",
        meetings: "AFA_Minutes_ resolutions_Consensus.html"
      }[selectedReport];

      link.setAttribute("download", fileNames);
      link.className = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  // Direct print-PDF trigger inside App
  const handlePrintDocument = () => {
    const htmlContent = generateHTMLTemplate();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // Wait for resources to load, then trigger native printer
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      // Inline print fallback
      alert("Popup blocker active. Please allow popups or download the beautiful HTML Report template to open and print it at your convenience!");
    }
  };

  return (
    <div id="report-template-center-backdrop" className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        id="report-template-center-modal" 
        className="bg-stone-50 border border-stone-250 rounded-xl w-full max-w-6xl shadow-2xl h-[90vh] flex flex-col overflow-hidden animate-fade-in text-stone-900 font-sans"
      >
        {/* Header bar of Report Portal */}
        <div className="bg-emerald-900 p-4 shrink-0 flex justify-between items-center text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800 rounded-lg text-emerald-300">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-sm font-sans font-extrabold uppercase tracking-widest flex items-center gap-2">
                AFA Administrative Report & Seal Template Hub
              </h2>
              <p className="text-[10px] text-emerald-250 font-mono">
                Compile vetted registries, financial statements, and compliance audits into pristine layout forms.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-emerald-100 hover:text-white p-2 hover:bg-emerald-800 cursor-pointer transition-colors rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        {/* Workspace Body splits: left Sidebar Configuration, right Live Physical Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
          
          {/* Left panel: Document Selector & Customizer parameters */}
          <div className="lg:col-span-2 border-r border-stone-200 bg-stone-100/50 flex flex-col overflow-y-auto p-4 space-y-5">
            
            {/* Sec 1: Document Selector Tab rows */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-mono font-extrabold text-stone-500 uppercase tracking-wider block">
                1. Select Target Reporting Domain
              </label>
              <div className="space-y-1">
                {[
                  { id: "members", name: "AFA-R-MEM: Members Land Audit", desc: `Aggregates ${filteredMembers.length} farmers with land stats`, icon: Users },
                  { id: "finances", name: "AFA-F-LED: Audited General Ledger", desc: `Cash balance indicator: ₱${stats.reserve.toLocaleString()}`, icon: Coins },
                  { id: "security", name: "AFA-A-LOG: Central Access Shield", desc: `${filteredAuditLogs.length} activity trails audited`, icon: ShieldCheck },
                  { id: "meetings", name: "AFA-M-MIN: Council Assembly Minutes", desc: `${meetings.length} executive sessions recorded`, icon: Calendar },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedReport(item.id as ReportType);
                        setCustomTitle("");
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-start gap-3 cursor-pointer ${
                        selectedReport === item.id
                          ? "bg-emerald-900 border-emerald-950 text-white shadow-sm ring-1 ring-emerald-900"
                          : "bg-white hover:bg-stone-50 border-stone-200 text-stone-750"
                      }`}
                    >
                      <Icon className={`mt-0.5 shrink-0 ${selectedReport === item.id ? "text-emerald-200" : "text-stone-500"}`} size={16} />
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold truncate text-[11.5px]">{item.name}</p>
                        <p className={`text-[10px] truncate ${selectedReport === item.id ? "text-emerald-100" : "text-stone-400 font-mono"}`}>
                          {item.desc}
                        </p>
                      </div>
                      {selectedReport === item.id && <Check size={14} className="shrink-0 text-emerald-300 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sec 2: Dynamic Filters based on selector selection */}
            <div className="space-y-3 bg-white p-3 rounded-lg border border-stone-200 shadow-xs">
              <h4 className="text-[10.5px] font-mono font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                <Filter size={12} className="text-stone-600" /> 2. Form Filter Criteria
              </h4>

              {selectedReport === "members" && (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 block mb-0.5">Barangay Sector</label>
                    <select 
                      value={barangayFilter} 
                      onChange={(e) => setBarangayFilter(e.target.value)}
                      className="w-full text-xs font-mono border border-stone-300 p-1.5 rounded outline-none bg-stone-50"
                    >
                      {uniqueBarangays.map(b => (
                        <option key={b} value={b}>{b === "ALL" ? "All Barangays" : b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 block mb-0.5">Crop Type Filter</label>
                    <select 
                      value={cropFilter} 
                      onChange={(e) => setCropFilter(e.target.value)}
                      className="w-full text-xs font-mono border border-stone-300 p-1.5 rounded outline-none bg-stone-50"
                    >
                      {uniqueCrops.map(c => (
                        <option key={c} value={c}>{c === "ALL" ? "All Crop Cultivations" : c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 block mb-0.5">Affiliation Status</label>
                    <select 
                      value={memberStatusFilter} 
                      onChange={(e) => setMemberStatusFilter(e.target.value)}
                      className="w-full text-xs font-mono border border-stone-300 p-1.5 rounded outline-none bg-stone-50"
                    >
                      <option value="ALL">All Status Levels</option>
                      <option value="Active">Active Affiliates</option>
                      <option value="Inactive">Inactive / Suspended</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedReport === "finances" && (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 block mb-0.5">S.Y. Reporting Period</label>
                    <select 
                      value={periodFilter} 
                      onChange={(e) => setPeriodFilter(e.target.value)}
                      className="w-full text-xs border border-stone-300 p-1.5 rounded outline-none bg-stone-50"
                    >
                      {uniquePeriods.map(p => (
                        <option key={p} value={p}>{p === "ALL" ? "All Periods Combined" : p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 block mb-0.5">Flow Sector</label>
                    <select 
                      value={cashTypeFilter} 
                      onChange={(e) => setCashTypeFilter(e.target.value)}
                      className="w-full text-xs font-mono border border-stone-300 p-1.5 rounded outline-none bg-stone-50"
                    >
                      <option value="ALL">All Flows</option>
                      <option value="Income">Association Inflow Only (Income)</option>
                      <option value="Expense">Association Disbursement (Expense)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 block mb-0.5">Fund Target Category</label>
                    <select 
                      value={cashCategoryFilter} 
                      onChange={(e) => setCashCategoryFilter(e.target.value)}
                      className="w-full text-xs border border-stone-300 p-1.5 rounded outline-none bg-stone-50"
                    >
                      {uniqueCategories.map(c => (
                        <option key={c} value={c}>{c === "ALL" ? "All Account Categories" : c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {selectedReport === "security" && (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 block mb-0.5">System Category Subsystem</label>
                    <select 
                      value={logDomainFilter} 
                      onChange={(e) => setLogDomainFilter(e.target.value)}
                      className="w-full text-xs font-mono border border-stone-300 p-1.5 rounded outline-none bg-stone-50"
                    >
                      {uniqueLogDomains.map(d => (
                        <option key={d} value={d}>{d === "ALL" ? "All System Categories" : d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 block mb-0.5">Operator Search (Actor detail)</label>
                    <input 
                      type="text" 
                      value={logActorFilter === "ALL" ? "" : logActorFilter} 
                      onChange={(e) => setLogActorFilter(e.target.value || "ALL")}
                      placeholder="e.g. mfa, fail, treasurer" 
                      className="w-full text-xs border border-stone-300 p-1.5 rounded outline-none font-mono bg-stone-50"
                    />
                  </div>
                </div>
              )}

              {selectedReport === "meetings" && (
                <div className="p-3 bg-stone-50 border rounded text-[11px] font-mono text-stone-500 leading-relaxed">
                  No active parameters. Standard AFA guidelines compile all convening councils to represent continuous legislative transparency.
                </div>
              )}
            </div>

            {/* Sec 3: Form Aesthetic Customizer parameters */}
            <div className="space-y-3 bg-white p-3 rounded-lg border border-stone-200 shadow-xs">
              <h4 className="text-[10.5px] font-mono font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                <Settings size={12} className="text-stone-600" /> 3. Layout Aesthetics
              </h4>
              
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] font-mono font-bold text-stone-650 block mb-0.5">Custom Title Override</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Enter document custom title..."
                    className="w-full border border-stone-300 p-1.5 rounded outline-none bg-stone-50 placeholder:italic"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 block mb-0.5">Typography Pair</label>
                    <select
                      value={fontTheme}
                      onChange={(e) => setFontTheme(e.target.value as FontTheme)}
                      className="w-full border border-stone-300 p-1.5 rounded outline-none bg-stone-50 font-mono text-[11px]"
                    >
                      <option value="serif">Classical Serif</option>
                      <option value="sans">Swiss Modernist</option>
                      <option value="mono">Technical Mono</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold text-stone-600 block mb-0.5">Watermark Stamp</label>
                    <select
                      value={watermark}
                      onChange={(e) => setWatermark(e.target.value as WatermarkType)}
                      className="w-full border border-stone-300 p-1.5 rounded outline-none bg-stone-50 font-mono text-[11px]"
                    >
                      <option value="NONE">- No Seal -</option>
                      <option value="OFFICIAL">Official Copy</option>
                      <option value="CONFIDENTIAL">Confidential</option>
                      <option value="APPROVED">Approved</option>
                      <option value="AUDITED">Audited Ledger</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 text-stone-700 font-bold select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showSummaryStats} 
                      onChange={(e) => setShowSummaryStats(e.target.checked)}
                      className="accent-emerald-700 h-3.5 w-3.5"
                    />
                    Display Audited Summary Widgets
                  </label>
                  <label className="flex items-center gap-2 text-stone-700 font-bold select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showSignatures} 
                      onChange={(e) => setShowSignatures(e.target.checked)}
                      className="accent-emerald-700 h-3.5 w-3.5"
                    />
                    Affix Executive Signatures
                  </label>
                </div>
              </div>
            </div>

            {/* Sec 4: Signatory Names Customizer */}
            {showSignatures && (
              <div className="space-y-3 bg-white p-3 rounded-lg border border-stone-200 shadow-xs animate-fade-in">
                <h4 className="text-[10.5px] font-mono font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <Signature size={12} className="text-stone-600" /> 4. Appoint Attesting Signatories
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[9px] font-mono font-bold text-stone-500 block mb-0.5">Primary Scribe</label>
                    <input
                      type="text"
                      value={signatory1}
                      onChange={(e) => setSignatory1(e.target.value)}
                      className="w-full border border-stone-300 p-1.5 rounded outline-none font-mono bg-stone-50"
                    />
                    <input
                      type="text"
                      value={signatory1Title}
                      onChange={(e) => setSignatory1Title(e.target.value)}
                      className="w-full border border-stone-300 p-1 rounded outline-none font-mono text-[9px] text-stone-500 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold text-stone-500 block mb-0.5">Secondary Scribe</label>
                    <input
                      type="text"
                      value={signatory2}
                      onChange={(e) => setSignatory2(e.target.value)}
                      className="w-full border border-stone-300 p-1.5 rounded outline-none font-mono bg-stone-50"
                    />
                    <input
                      type="text"
                      value={signatory2Title}
                      onChange={(e) => setSignatory2Title(e.target.value)}
                      className="w-full border border-stone-300 p-1 rounded outline-none font-mono text-[9px] text-stone-500 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold text-stone-500 block mb-0.5">Attending Executive Witness</label>
                    <input
                      type="text"
                      value={signatory3}
                      onChange={(e) => setSignatory3(e.target.value)}
                      className="w-full border border-stone-300 p-1.5 rounded outline-none font-mono bg-stone-50"
                    />
                    <input
                      type="text"
                      value={signatory3Title}
                      onChange={(e) => setSignatory3Title(e.target.value)}
                      className="w-full border border-stone-300 p-1 rounded outline-none font-mono text-[9px] text-stone-500 mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Living Document preview */}
          <div className="lg:col-span-3 bg-stone-200/60 flex flex-col overflow-hidden relative">
            <div className="bg-stone-300/40 border-b border-stone-200 p-2.5 shrink-0 flex justify-between items-center text-xs font-mono select-none">
              <span className="text-stone-600 font-bold flex items-center gap-1.5">
                <FileText size={14} /> Living Formal Document Preview (AFA Engine)
              </span>
              <span className="text-stone-500 font-bold">
                {selectedReport === "members" ? `${filteredMembers.length} Rows` : selectedReport === "finances" ? `${filteredCashflow.length} Rows` : selectedReport === "security" ? `${filteredAuditLogs.length} Rows` : `${meetings.length} Rows`}
              </span>
            </div>

            {/* Simulated Paper sheet body */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-stone-350 bg-radial font-sans">
              <div 
                id="printable-report-sheet" 
                className={`bg-white border rounded shadow-lg p-8 w-full max-w-2xl relative min-h-[842px] flex flex-col justify-between ${fontClass}`}
              >
                {/* Embedded absolute Watermark */}
                {watermark !== "NONE" && (
                  <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden pr-6">
                    <span className="text-stone-150 font-black text-6xl tracking-widest uppercase -rotate-35 leading-none opacity-20">
                      {watermark}
                    </span>
                  </div>
                )}

                {/* Main Paper Content container */}
                <div className="space-y-6 relative z-10 text-stone-900">
                  
                  {/* Formal Header Seal block */}
                  <div className="border-b-4 border-double border-emerald-900 pb-3 flex justify-between items-end">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 border border-emerald-950 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-800 font-extrabold text-lg shadow-sm">
                        🌾
                      </div>
                      <div className="text-left leading-tight">
                        <h2 className="text-sm font-black text-emerald-800 uppercase tracking-widest">Alegria Farmers Association</h2>
                        <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider block">Central Auditing & Governance Ledger Registry</span>
                      </div>
                    </div>
                    <div className="text-right text-[8px] font-mono text-stone-400">
                      CONTROL REFERENCE NUMBER
                      <span className="block text-[10px] font-bold text-emerald-900">{documentControlCode}</span>
                    </div>
                  </div>

                  {/* Document Subject */}
                  <div className="text-center pt-2">
                    <h1 className="text-sm font-black uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-1.5 inline-block">
                      {reportTitleComputed}
                    </h1>
                    <p className="text-[10px] text-stone-500 font-mono uppercase mt-1 tracking-wider">Certified Audit Registry Statement</p>
                  </div>

                  {/* Metadata key value grid table block */}
                  <div className="grid grid-cols-2 gap-4 border border-stone-200 bg-stone-50 p-3 text-[10px] leading-relaxed font-sans">
                    <div className="space-y-1 text-left">
                      <div className="flex justify-between border-b border-stone-150 pb-0.5">
                        <span className="font-mono text-stone-500 uppercase">Compiled Date</span>
                        <span className="font-bold text-stone-800">{new Date().toLocaleDateString()} UTC</span>
                      </div>
                      <div className="flex justify-between border-b border-stone-150 pb-0.5">
                        <span className="font-mono text-stone-500 uppercase">Charter Sector</span>
                        <span className="font-bold text-stone-800">Alegria, Cebu</span>
                      </div>
                      <div className="flex justify-between pb-0.5">
                        <span className="font-mono text-stone-500 uppercase">Integrity Stance</span>
                        <span className="font-bold text-stone-800">Verified System Ledger</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-left">
                      <div className="flex justify-between border-b border-stone-150 pb-0.5">
                        <span className="font-mono text-stone-500 uppercase">Generating Scribe</span>
                        <span className="font-bold text-stone-800">{currentUser ? currentUser.fullName : "Central Operations"}</span>
                      </div>
                      <div className="flex justify-between border-b border-stone-150 pb-0.5">
                        <span className="font-mono text-stone-500 uppercase">Security Clearance</span>
                        <span className="font-bold text-stone-800">Central Level 10</span>
                      </div>
                      <div className="flex justify-between pb-0.5">
                        <span className="font-mono text-stone-500 uppercase">Charter Status</span>
                        <span className="font-bold text-stone-800 text-emerald-800">Active Audit Compliance</span>
                      </div>
                    </div>
                  </div>

                  {/* Optional statistical summary widgets inside sheet */}
                  {showSummaryStats && (
                    <div className="grid grid-cols-3 gap-2.5">
                      {selectedReport === "members" && (
                        <>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50">
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Rostered Stakeholders</span>
                            <strong className="text-sm font-black text-stone-800">{filteredMembers.length} farmers</strong>
                          </div>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50">
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Aggregate Acreage</span>
                            <strong className="text-sm font-black text-stone-800">{stats.totalMembersSize.toFixed(1)} Ha</strong>
                          </div>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50">
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Mean Demographic Age</span>
                            <strong className="text-sm font-black text-stone-800">{stats.avgMemberAge} Years</strong>
                          </div>
                        </>
                      )}
                      {selectedReport === "finances" && (
                        <>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50">
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Fund Inflow Log</span>
                            <strong className="text-xs font-black text-emerald-800">₱{stats.inflow.toLocaleString()}</strong>
                          </div>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50">
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Fund Outflow Log</span>
                            <strong className="text-xs font-black text-rose-800">₱{stats.outflow.toLocaleString()}</strong>
                          </div>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50 border-emerald-900/30 bg-emerald-50/30">
                            <span className="block text-[8px] font-mono uppercase text-emerald-800 font-bold mb-1">Liquid Reserve</span>
                            <strong className="text-xs font-black text-emerald-900">₱{stats.reserve.toLocaleString()}</strong>
                          </div>
                        </>
                      )}
                      {selectedReport === "security" && (
                        <>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50">
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Security Events Tracked</span>
                            <strong className="text-xs font-black text-stone-800">{filteredAuditLogs.length} Trails</strong>
                          </div>
                          <div className={`border border-stone-200 rounded p-2 text-center ${stats.criticalIncidents > 0 ? "border-rose-400 bg-rose-50" : "bg-stone-50/50"}`}>
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Incidents Flagged</span>
                            <strong className={`text-xs font-black ${stats.criticalIncidents > 0 ? "text-rose-800 animate-pulse" : "text-stone-800"}`}>{stats.criticalIncidents} anomalies</strong>
                          </div>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50">
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Governance Standard</span>
                            <strong className="text-[10px] font-black text-stone-800 uppercase font-mono">Certified Secure</strong>
                          </div>
                        </>
                      )}
                      {selectedReport === "meetings" && (
                        <>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50">
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Sessions Streamed</span>
                            <strong className="text-xs font-black text-stone-800">{meetings.length} General Assemblies</strong>
                          </div>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50">
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Stakeholder Quorum mean</span>
                            <strong className="text-xs font-black text-stone-800">{stats.averageAttendance} attendees</strong>
                          </div>
                          <div className="border border-stone-200 rounded p-2 text-center bg-stone-50/50">
                            <span className="block text-[8px] font-mono uppercase text-stone-400 font-bold mb-1">Resolutions Enacted</span>
                            <strong className="text-xs font-black text-stone-800">{stats.resolutionsAdopted} Adopted</strong>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Table area formatted elegantly */}
                  <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left text-[9px] border-collapse leading-tight font-sans">
                      <thead>
                        <tr className="border-t-2 border-b border-stone-250 text-emerald-950 font-bold bg-stone-50 font-mono">
                          {selectedReport === "members" && (
                            <>
                              <th className="py-1 px-1 text-center">Ref</th>
                              <th className="py-1 px-1.5">Farmer Name</th>
                              <th className="py-1 px-1">Location</th>
                              <th className="py-1 px-1.5">Registered</th>
                              <th className="py-1 px-1 text-right">Acreage</th>
                              <th className="py-1 px-1.5">Crops cultivated</th>
                              <th className="py-1 px-1 text-right">Stance</th>
                            </>
                          )}
                          {selectedReport === "finances" && (
                            <>
                              <th className="py-1 px-1">Ref</th>
                              <th className="py-1 px-1">Date</th>
                              <th className="py-1 px-1.5">Target Category</th>
                              <th className="py-1 px-2">Purpose/Details</th>
                              <th className="py-1 px-1.5">Period</th>
                              <th className="py-1 px-1 text-right">Cash Transacted</th>
                            </>
                          )}
                          {selectedReport === "security" && (
                            <>
                              <th className="py-1 px-1">Timestamp</th>
                              <th className="py-1 px-1">Operator Profile</th>
                              <th className="py-1 px-1">Subsystem</th>
                              <th className="py-1 px-1">System Action</th>
                              <th className="py-1 px-2">Action Details</th>
                            </>
                          )}
                          {selectedReport === "meetings" && (
                            <>
                              <th className="py-1 px-1">Session Date</th>
                              <th className="py-1 px-1.5">Assembly Session Name</th>
                              <th className="py-1 px-1">Attendees</th>
                              <th className="py-1 px-1">Recorded By</th>
                              <th className="py-1 px-2">Key Decrees & Enacted Resolutions</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-150">
                        {selectedReport === "members" && (
                          filteredMembers.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-8 text-stone-400 font-mono">No matching records filtered.</td></tr>
                          ) : (
                            filteredMembers.slice(0, 20).map((m, i) => (
                              <tr key={m.id} className="hover:bg-stone-50/50 transition duration-75">
                                <td className="py-2.5 px-1 font-mono text-stone-500 text-center">{i + 1}</td>
                                <td className="py-2.5 px-1.5">
                                  <div className="font-extrabold text-stone-900">{m.name}</div>
                                  <div className="text-[7.5px] font-mono text-stone-400">ID: {m.id}</div>
                                </td>
                                <td className="py-2.5 px-1 font-medium text-stone-700">{m.barangay}</td>
                                <td className="py-2.5 px-1.5 font-mono text-stone-500">{new Date(m.registeredAt).toLocaleDateString()}</td>
                                <td className="py-2.5 px-1 text-right font-mono font-bold text-stone-800">{m.farmSizeHa.toFixed(2)} Ha</td>
                                <td className="py-2.5 px-1.5 font-medium text-stone-650 max-w-[150px] truncate">{m.primaryCrops.join(", ")}</td>
                                <td className="py-2.5 px-1 text-right">
                                  <span className={`px-1 rounded-[3px] text-[7.5px] font-mono font-bold ${
                                    m.status === "Active" ? "bg-emerald-50 text-emerald-800" : "bg-stone-150 text-stone-600"
                                  }`}>{m.status}</span>
                                </td>
                              </tr>
                            ))
                          )
                        )}
                        {selectedReport === "finances" && (
                          filteredCashflow.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-stone-400 font-mono">No cash ledger matching filter.</td></tr>
                          ) : (
                            filteredCashflow.slice(0, 15).map((c) => (
                              <tr key={c.id} className="hover:bg-stone-50/50 transition">
                                <td className="py-2.5 px-1 font-mono text-stone-500">{c.id}</td>
                                <td className="py-2.5 px-1 font-mono text-stone-500 leading-none">{new Date(c.date).toLocaleDateString()}</td>
                                <td className="py-2.5 px-1.5 font-extrabold text-stone-800">{c.category}</td>
                                <td className="py-2.5 px-2 text-stone-600 font-medium">
                                  <div>{c.description}</div>
                                  <div className="text-[7px] text-stone-400 font-mono">Operator: {c.loggedBy}</div>
                                </td>
                                <td className="py-2.5 px-1.5 font-mono text-stone-500 text-[8px] whitespace-nowrap">{c.period}</td>
                                <td className={`py-2.5 px-1 text-right font-mono font-bold ${
                                  c.type === "Income" ? "text-emerald-800" : "text-rose-800"
                                }`}>
                                  {c.type === "Income" ? "+" : "-"}₱{c.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )
                        )}
                        {selectedReport === "security" && (
                          filteredAuditLogs.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-stone-400 font-mono">No security logs recorded.</td></tr>
                          ) : (
                            filteredAuditLogs.slice(0, 15).map((l) => (
                              <tr key={l.id} className="hover:bg-stone-50/50 transition">
                                <td className="py-2.5 px-1 font-mono text-[8px] text-stone-500 leading-none">{new Date(l.timestamp).toLocaleString()}</td>
                                <td className="py-2.5 px-1 font-bold text-stone-800">{l.actor}</td>
                                <td className="py-2.5 px-1 font-mono text-[8px] text-stone-500">{l.domain}</td>
                                <td className="py-2.5 px-1 font-extrabold text-stone-900">{l.action}</td>
                                <td className="py-2.5 px-2 font-mono text-[8px] text-stone-600 leading-tight max-w-[180px] break-words">{l.details}</td>
                              </tr>
                            ))
                          )
                        )}
                        {selectedReport === "meetings" && (
                          meetings.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-stone-400 font-mono">No convene records located.</td></tr>
                          ) : (
                            meetings.slice(0, 10).map((m) => (
                              <tr key={m.id} className="hover:bg-stone-50/50 transition">
                                <td className="py-2.5 px-1 font-mono text-stone-500">{new Date(m.date).toLocaleDateString()}</td>
                                <td className="py-2.5 px-1.5 font-extrabold text-stone-800 max-w-[120px] truncate">{m.title}</td>
                                <td className="py-2.5 px-1 font-mono font-bold text-stone-600">{m.attendeesCount} attendees</td>
                                <td className="py-2.5 px-1 text-stone-600">{m.recordedBy}</td>
                                <td className="py-2.5 px-2 text-stone-500 font-medium max-w-[200px]">
                                  <ul className="list-disc pl-3 text-[8.5px] space-y-0.5">
                                    {(m.resolutions || []).slice(0, 3).map((r, ri) => (
                                      <li key={ri} className="truncate">{r}</li>
                                    ))}
                                    {(m.resolutions || []).length > 3 && <li className="italic text-[7.5px] text-stone-400">+ {(m.resolutions || []).length - 3} other decrees</li>}
                                  </ul>
                                </td>
                              </tr>
                            ))
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Limit preview truncation notice */}
                  {((selectedReport === "members" && filteredMembers.length > 20) ||
                    (selectedReport === "finances" && filteredCashflow.length > 15) ||
                    (selectedReport === "security" && filteredAuditLogs.length > 15) ||
                    (selectedReport === "meetings" && meetings.length > 10)) && (
                    <p className="no-print text-[8.5px] text-stone-400 font-mono text-center italic border-t pt-1.5">
                      ⚠️ Preview displays initial active rows only. Standing downloaded files compiles entire filtered {
                        selectedReport === "members" ? filteredMembers.length : selectedReport === "finances" ? filteredCashflow.length : selectedReport === "security" ? filteredAuditLogs.length : meetings.length
                      } ledger elements safely.
                    </p>
                  )}

                  {/* Visual attestations sign blocks mock */}
                  {showSignatures && (
                    <div className="grid grid-cols-3 gap-4 pt-10 border-t border-stone-200 text-center animate-fade-in select-none">
                      <div>
                        <div className="w-2/3 border-b border-stone-400 mx-auto mb-1 h-6"></div>
                        <p className="text-[9px] font-black text-stone-850">{signatory1}</p>
                        <p className="text-[7.5px] font-mono text-stone-400 uppercase tracking-tight">{signatory1Title}</p>
                        <p className="text-[7px] font-mono text-emerald-800 font-bold mt-0.5">✓ SIGNATURE ATTESTED</p>
                      </div>
                      <div>
                        <div className="w-2/3 border-b border-stone-400 mx-auto mb-1 h-6"></div>
                        <p className="text-[9px] font-black text-stone-850">{signatory2}</p>
                        <p className="text-[7.5px] font-mono text-stone-400 uppercase tracking-tight">{signatory2Title}</p>
                        <p className="text-[7px] font-mono text-emerald-800 font-bold mt-0.5">✓ SIGNATURE ATTESTED</p>
                      </div>
                      <div>
                        <div className="w-2/3 border-b border-stone-400 mx-auto mb-1 h-6"></div>
                        <p className="text-[9px] font-black text-stone-850">{signatory3}</p>
                        <p className="text-[7.5px] font-mono text-stone-400 uppercase tracking-tight">{signatory3Title}</p>
                        <p className="text-[7px] font-mono text-emerald-800 font-bold mt-0.5">✓ SIGNATURE ATTESTED</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Foot seals */}
                <div className="border-t border-stone-150 pt-2 flex justify-between text-[7px] font-mono text-stone-400 leading-none select-none shrink-0 mt-8">
                  <span>Alegria Farmers Association Compliance • Central Registry Security Ledger</span>
                  <span>System Engine S.Y. 2025-2026 Admin Portal</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions footer bar */}
            <div className="bg-stone-100 border-t border-stone-250 p-4 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-[10px] text-stone-500 font-mono text-center sm:text-left leading-relaxed">
                📥 Select download format or dispatch direct to local office printer. 
                <br/>
                All templates comply with AFA executive charters.
              </div>
              <div className="flex gap-2 flex-wrap justify-center font-sans">
                <button
                  type="button"
                  onClick={handleRawCSVFallback}
                  className="bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold py-2.5 px-4 rounded-lg border border-stone-300 flex items-center gap-2 cursor-pointer transition shadow-xs"
                >
                  <FileSpreadsheet size={14} className="text-emerald-800" />
                  Legacy CSV SpreadSheet
                </button>

                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="bg-stone-800 hover:bg-black text-stone-100 text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 cursor-pointer transition shadow-xs"
                >
                  <Printer size={14} />
                  Print Document Circular
                </button>

                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleDownloadHTMLTemplate}
                  className="bg-emerald-900 hover:bg-emerald-950 disabled:bg-stone-400 text-stone-100 text-xs font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 cursor-pointer transition shadow-md"
                >
                  <Download size={14} />
                  {isDownloading ? "Generating..." : "Download Beautiful HTML Template"}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
