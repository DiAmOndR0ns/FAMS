import React, { useState } from "react";
import { Member, Announcement, Product, Meeting, CashFlow } from "../types";
import {
  Calendar,
  Briefcase,
  Tag,
  Users,
  Landmark,
  FileText,
  User,
  LogOut,
  RefreshCw,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  Search,
  BookOpen,
  Award,
  Compass,
  Image,
  Download,
  Camera,
  Upload,
  Trash2,
  X
} from "lucide-react";

interface MemberPortalViewProps {
  member: Member;
  announcements: Announcement[];
  products: Product[];
  meetings: Meeting[];
  cashflow: CashFlow[];
  members: Member[];
  onLogout: () => void;
  isOnline: boolean;
}

export default function MemberPortalView({
  member,
  announcements,
  products,
  meetings,
  cashflow,
  members,
  onLogout,
  isOnline
}: MemberPortalViewProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "announcements" | "products" | "meetings" | "finances" | "roster">("dashboard");
  const [rosterSearch, setRosterSearch] = useState("");
  const [showPrintIDCard, setShowPrintIDCard] = useState(false);

  // States for user-captured or user-uploaded ID image with premium persistence
  const [capturedImage, setCapturedImage] = useState<string | null>(() => {
    return localStorage.getItem(`afa_member_photo_${member.id}`) || null;
  });
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Failed to access camera", err);
      alert("Could not access your camera. Make sure permissions are granted and that your device has an active camera.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw the camera output onto the canvas
        ctx.scale(-1, 1); // Mirror effect for web cameras
        ctx.translate(-400, 0);
        ctx.drawImage(videoRef.current, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setCapturedImage(dataUrl);
        localStorage.setItem(`afa_member_photo_${member.id}`, dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Safe release of webcam stream on unmount
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        localStorage.setItem(`afa_member_photo_${member.id}`, dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setCapturedImage(null);
    localStorage.removeItem(`afa_member_photo_${member.id}`);
  };

  // Financial status inside the transparent member portal
  const totalIncome = cashflow.filter(c => c.type === "Income").reduce((sum, c) => sum + c.amount, 0);
  const totalExpense = cashflow.filter(c => c.type === "Expense").reduce((sum, c) => sum + c.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    m.id.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    m.barangay.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  const [isExporting, setIsExporting] = useState(false);

  const handlePrintCardOnly = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to open the printable card layout.");
      return;
    }
    const cropStr = Array.isArray(member.primaryCrops) ? member.primaryCrops.join(", ") : member.primaryCrops;
    printWindow.document.write(`
      <html>
        <head>
          <title>AFA Member ID badge - ${member.name}</title>
          <style>
            @page {
              size: 3.375in 2.125in;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #022c22;
              color: #f5f5f4;
              font-family: system-ui, -apple-system, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              width: 100vw;
              overflow: hidden;
            }
            .card {
              width: 3.375in;
              height: 2.125in;
              box-sizing: border-box;
              border: 1px solid #10b981;
              border-radius: 12px;
              background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
              position: relative;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
              padding: 10px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid rgba(255,255,255,0.15);
              padding-bottom: 4px;
            }
            .header-title {
              font-size: 7px;
              font-weight: 800;
              text-transform: uppercase;
              color: #34d399;
              letter-spacing: 0.5px;
            }
            .body {
              display: flex;
              gap: 8px;
              align-items: center;
              flex: 1;
              padding: 6px 0;
            }
            .avatar {
              width: 44px;
              height: 44px;
              background-color: #065f46;
              border: 1.5px solid #34d399;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: bold;
              color: white;
              text-transform: uppercase;
              overflow: hidden;
            }
            .avatar img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .details {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .name {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #ffffff;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .id-no {
              font-size: 7px;
              font-weight: 500;
              font-family: monospace;
              color: #a7f3d0;
              margin-bottom: 2px;
            }
            .metrics {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 2px;
              border-top: 1px solid rgba(255,255,255,0.15);
              padding-top: 3px;
            }
            .metric-item {
              font-size: 5px;
              color: #9ca3af;
              line-height: 1.2;
            }
            .metric-item strong {
              color: #ffffff;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 4.5px;
              font-family: monospace;
              color: rgba(110, 231, 183, 0.7);
              border-top: 1px solid rgba(255,255,255,0.15);
              padding-top: 4px;
            }
            .barcode {
              display: flex;
              gap: 0.5px;
              height: 10px;
            }
            .barcode span {
              background-color: #10b981;
              width: 0.5px;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <span class="header-title">🌾 Alegria Farmers Association</span>
              <span style="font-size:5px; padding:1px 3px; background:#047857; color:white; border-radius:2px; font-weight:bold;">AFA</span>
            </div>
            <div class="body">
              <div class="avatar">
                ${
                  capturedImage
                    ? `<img src="${capturedImage}" alt="${member.name}" />`
                    : member.name.split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase()
                }
              </div>
              <div class="details">
                <div class="name">${member.name}</div>
                <div class="id-no">MEMBER ID: ${member.id}</div>
                <div class="metrics">
                  <div class="metric-item">Zone: <strong>Brgy. ${member.barangay}</strong></div>
                  <div class="metric-item">Status: <strong>${member.status}</strong></div>
                  <div class="metric-item">Scale: <strong>${member.farmSizeHa} Ha</strong></div>
                  <div class="metric-item">Crops: <strong style="display:inline-block; max-width:40px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${cropStr}</strong></div>
                </div>
              </div>
            </div>
            <div class="footer">
              <div>
                VERIFIED COOP RECORD BARANGAY ALEGRIA FAMS
              </div>
              <div class="barcode">
                <span style="width: 1px;"></span>
                <span style="width: 0.5px;"></span>
                <span style="width: 0.8px;"></span>
                <span style="width: 1.2px;"></span>
                <span style="width: 0.5px;"></span>
                <span style="width: 1px;"></span>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 1500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportPNG = () => {
    setIsExporting(true);
    
    // Create a high-res canvas (1000px width x 630px height)
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsExporting(false);
      return;
    }

    const drawRoundedRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fillCol: string, borderCol?: string, borderW?: number) => {
      c.fillStyle = fillCol;
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
      c.fill();
      if (borderCol && borderW) {
        c.strokeStyle = borderCol;
        c.lineWidth = borderW;
        c.stroke();
      }
    };

    const runCardRender = (loadedPhotoImg?: HTMLImageElement) => {
      // 1. Background Gradient (Solid, Deep Forest Emerald)
      const gd = ctx.createLinearGradient(0, 0, 1000, 630);
      gd.addColorStop(0, "#022c22"); // emerald-950
      gd.addColorStop(0.5, "#064e4b"); // emerald-900 / gradient middle
      gd.addColorStop(1, "#022c22"); // emerald-950
      ctx.fillStyle = gd;
      ctx.fillRect(0, 0, 1000, 630);

      // 2. Translucent Circular Background Flares & Accents
      ctx.fillStyle = "rgba(16, 185, 129, 0.04)"; // emerald-500 low opacity
      ctx.beginPath();
      ctx.arc(850, 100, 200, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(110, 231, 183, 0.05)"; // emerald-300 low opacity
      ctx.beginPath();
      ctx.arc(150, 480, 160, 0, Math.PI * 2);
      ctx.fill();

      // 3. Header Top Accent strip
      ctx.fillStyle = "#011f18"; // deeper darker tone
      ctx.fillRect(0, 0, 1000, 100);

      // Draw bottom accent line on header
      ctx.fillStyle = "#10b981"; // emerald-500
      ctx.fillRect(0, 98, 1000, 2);

      // 4. Header Badge / Title "ALEGRIA FARMERS ASSOCIATION"
      drawRoundedRect(ctx, 45, 25, 90, 50, 12, "#047857");
      
      // AFA Logo Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("AFA", 90, 60);

      // Header Titles
      ctx.textAlign = "left";
      ctx.fillStyle = "#34d399"; // emerald-450
      ctx.font = "900 13px system-ui, -apple-system, sans-serif";
      
      // tracking-widest simulation
      const drawLetterSpacingText = (c: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) => {
        let currentX = x;
        for (let i = 0; i < text.length; i++) {
          c.fillText(text[i], currentX, y);
          currentX += c.measureText(text[i]).width + spacing;
        }
      };
      drawLetterSpacingText(ctx, "BARANGAY ALEGRIA FARMERS ASSOCIATION", 160, 43, 1.5);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
      ctx.fillText("OFFICIAL MEMBERSHIP DIGITAL BADGE PASS", 160, 72);

      // 5. Left Portrait Avatar Box (Simulated ID Photo)
      const photoX = 60;
      const photoY = 150;
      const photoW = 220;
      const photoH = 240;
      const photoR = 20;

      // Draw avatar background & border
      drawRoundedRect(ctx, photoX, photoY, photoW, photoH, photoR, "#065f46", "#34d399", 4);

      if (loadedPhotoImg) {
        // Draw user captured/uploaded photo inside the rounded rectangle with clip path
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(photoX + photoR, photoY);
        ctx.lineTo(photoX + photoW - photoR, photoY);
        ctx.quadraticCurveTo(photoX + photoW, photoY, photoX + photoW, photoY + photoR);
        ctx.lineTo(photoX + photoW, photoY + photoH - photoR);
        ctx.quadraticCurveTo(photoX + photoW, photoY + photoH, photoX + photoW - photoR, photoY + photoH);
        ctx.lineTo(photoX + photoR, photoY + photoH);
        ctx.quadraticCurveTo(photoX, photoY + photoH, photoX, photoY + photoH - photoR);
        ctx.lineTo(photoX, photoY + photoR);
        ctx.quadraticCurveTo(photoX, photoY, photoX + photoR, photoY);
        ctx.closePath();
        ctx.clip();

        // Calculate aspect ratios for optimal aspect-fill (object-fit: cover) inside 220x240
        const imgAspect = loadedPhotoImg.width / loadedPhotoImg.height;
        const rectAspect = photoW / photoH;
        let dWidth = photoW;
        let dHeight = photoH;
        let dX = photoX;
        let dY = photoY;

        if (imgAspect > rectAspect) {
          dWidth = photoH * imgAspect;
          dX = photoX - (dWidth - photoW) / 2;
        } else {
          dHeight = photoW / imgAspect;
          dY = photoY - (dHeight - photoH) / 2;
        }

        ctx.drawImage(loadedPhotoImg, dX, dY, dWidth, dHeight);
        ctx.restore();

        // Draw overlay border again so edges are perfectly clean
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(photoX + photoR, photoY);
        ctx.lineTo(photoX + photoW - photoR, photoY);
        ctx.quadraticCurveTo(photoX + photoW, photoY, photoX + photoW, photoY + photoR);
        ctx.lineTo(photoX + photoW, photoY + photoH - photoR);
        ctx.quadraticCurveTo(photoX + photoW, photoY + photoH, photoX + photoW - photoR, photoY + photoH);
        ctx.lineTo(photoX + photoR, photoY + photoH);
        ctx.quadraticCurveTo(photoX, photoY + photoH, photoX, photoY + photoH - photoR);
        ctx.lineTo(photoX, photoY + photoR);
        ctx.quadraticCurveTo(photoX, photoY, photoX + photoR, photoY);
        ctx.closePath();
        ctx.stroke();
      } else {
        // Fallback: Inner Monogram Initials
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.font = "800 76px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        const initials = member.name.split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase();
        ctx.fillText(initials, 172, 292);

        ctx.fillStyle = "#ffffff";
        ctx.font = "800 72px system-ui, -apple-system, sans-serif";
        ctx.fillText(initials, 170, 290);
      }

      // Green verification check beneath photo
      drawRoundedRect(ctx, 100, 410, 140, 32, 10, "#064e3b", "#10b981", 1);
      ctx.fillStyle = "#6ee7b7";
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✓ VERIFIED MEMBER", 170, 430);

      // 6. Right side details
      ctx.textAlign = "left";
      
      // Member Name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 42px system-ui, -apple-system, sans-serif";
      ctx.fillText(member.name.toUpperCase(), 320, 200);

      // ID indicator
      ctx.fillStyle = "#a7f3d0"; // emerald-200
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      ctx.fillText("MEMBER IDENTIFIER:", 320, 240);

      ctx.fillStyle = "#fbbf24"; // golden ID
      ctx.font = "bold 18px monospace, sans-serif";
      ctx.fillText(member.id, 497, 240);

      // Divider line
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(320, 260, 620, 1.5);

      // 7. Info Grid
      const drawGridItem = (c: CanvasRenderingContext2D, title: string, value: string, x: number, y: number) => {
        c.fillStyle = "#86efac"; // emerald-300
        c.font = "bold 12px system-ui, -apple-system, sans-serif";
        c.fillText(title.toUpperCase(), x, y);

        c.fillStyle = "#ffffff";
        c.font = "800 22px system-ui, -apple-system, sans-serif";
        c.fillText(value, x, y + 28);
      };

      // Row 1
      drawGridItem(ctx, "Residential Address", `Brgy. ${member.barangay}, Tuburan`, 320, 310);
      drawGridItem(ctx, "Roster Status", `${member.status} Participant`, 650, 310);

      // Row 2
      drawGridItem(ctx, "Cooperative Land Scale", `${member.farmSizeHa || "1.0"} Hectares`, 320, 400);
      const cropStr = Array.isArray(member.primaryCrops) ? member.primaryCrops.join(", ") : member.primaryCrops;
      drawGridItem(ctx, "Primary Crops", cropStr, 650, 400);

      // 8. Footer (Dark block with seal details)
      ctx.fillStyle = "#011f18";
      ctx.fillRect(0, 500, 1000, 130);
      ctx.fillStyle = "#34d399";
      ctx.fillRect(0, 500, 1000, 2);

      ctx.fillStyle = "#6ee7b7";
      ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
      ctx.fillText("ALEGRIA DIGITAL FAMS PORTAL SECURITY TOKEN", 45, 545);

      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px system-ui, -apple-system, sans-serif";
      ctx.fillText("Certified and Verified Offline-First Agrarian Transparency Portal.", 45, 575);

      // 9. Simulated Barcode Block
      const barcodeX = 740;
      const barcodeY = 525;
      const barcodeW = 210;
      const barcodeH = 65;

      ctx.fillStyle = "#000000";
      ctx.fillRect(barcodeX, barcodeY, barcodeW, barcodeH);

      ctx.fillStyle = "#10b981"; // emerald bar code lines
      let curX = barcodeX + 15;
      const patterns = [4, 2, 8, 2, 4, 6, 2, 8, 4, 2, 6, 4, 8, 2, 6, 2, 4, 6, 8, 2];
      for (let i = 0; i < patterns.length; i++) {
        const width = patterns[i];
        ctx.fillRect(curX, barcodeY + 8, width, barcodeH - 16);
        curX += width + (i % 3 === 0 ? 6 : 3);
      }

      // Convert to Image Download
      try {
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `AFA_Farmer_ID_${member.name.replace(/\s+/g, "_")}.png`;
        link.href = url;
        link.click();
      } catch (err) {
        console.error("Canvas export failed", err);
      } finally {
        setIsExporting(false);
      }
    };

    if (capturedImage) {
      const userImg = new window.Image();
      userImg.onload = () => {
        runCardRender(userImg);
      };
      userImg.onerror = () => {
        console.error("Failed to load user image for export. Defaulting to initials monogram.");
        runCardRender();
      };
      userImg.src = capturedImage;
    } else {
      runCardRender();
    }
  };

  return (
    <div id="member-portal-container" className="max-w-7xl mx-auto px-4 py-8 font-sans selection:bg-emerald-250">
      {/* Member Portal Banner Head */}
      <div id="member-header-bar" className="border-b-2 border-emerald-800 pb-5 mb-8 md:flex md:items-center md:justify-between text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="bg-emerald-850 text-white p-3 rounded-xl font-mono text-xl font-extrabold tracking-wider shadow border border-emerald-700">
            AFA
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                AFA MEMBER PORTAL
              </span>
              <span className="text-xs text-stone-400 font-mono">SECURE DIRECT VIEW</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Welcome back, {member.name}!</h1>
            <p className="text-xs text-stone-500 font-mono">
              Registered ID: <span className="font-bold text-emerald-800">{member.id}</span> • Farm Zone: Barangay {member.barangay}
            </p>
          </div>
        </div>

        <div className="mt-4 md:mt-0 flex flex-wrap gap-2 justify-center">
          <span className="text-xs bg-stone-100 text-stone-700 border px-3 py-1.5 rounded-lg flex items-center gap-1 font-mono">
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-505 bg-emerald-600" : "bg-amber-600 animate-pulse"}`} />
            {isOnline ? "Synced to Central Database" : "Cached Offline Mode"}
          </span>
          <button
            onClick={() => setShowPrintIDCard(!showPrintIDCard)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <User size={14} /> {showPrintIDCard ? "Hide Digital Pass" : "My Digital ID Card"}
          </button>
          <button
            onClick={onLogout}
            className="bg-rose-900 text-stone-50 hover:bg-rose-950 text-xs font-bold px-4 py-1.5 rounded-lg transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={13} /> Exit Portal
          </button>
        </div>
      </div>

      {/* Dynamic Membership Highlight ID Card overlay */}
      {showPrintIDCard && (
        <div className="bg-stone-50 border-2 border-dashed border-emerald-800/40 rounded-xl p-6 mb-8 relative animate-fade-in no-print">
          <div className="absolute top-4 right-4 flex flex-wrap gap-2 justify-end">
            <button
              onClick={handlePrintCardOnly}
              className="bg-emerald-800 hover:bg-emerald-900 text-stone-50 text-xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition hover:scale-[1.02] active:scale-95 shadow cursor-pointer font-sans"
              title="Print standard physical ID card dimensions"
            >
              <Printer size={13} /> Print Physical ID Card
            </button>
            <button
              onClick={handleExportPNG}
              disabled={isExporting}
              className="bg-stone-800 hover:bg-stone-900 text-stone-50 text-xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition hover:scale-[1.02] active:scale-95 shadow cursor-pointer disabled:opacity-60 font-sans"
              title="Export high-resolution PNG image format"
            >
              {isExporting ? (
                <RefreshCw size={13} className="animate-spin text-emerald-400" />
              ) : (
                <Download size={13} className="text-emerald-400" />
              )}
              {isExporting ? "Compiling PNG..." : "Export as PNG"}
            </button>
          </div>
          <h2 className="text-sm font-mono font-bold text-stone-500 uppercase tracking-widest mb-4">Official Cooperative Member ID Badge</h2>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            {/* The Badge Container */}
            <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-stone-100 w-full max-w-sm rounded-2xl shadow-xl border border-emerald-700 overflow-hidden relative">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-800/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-300/10 rounded-full blur-2xl" />

              {/* Card Header */}
              <div className="bg-emerald-950 p-4 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-700 text-stone-50 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">AFA</span>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-300">Cebu Association Member</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>

              {/* Card Body */}
              <div className="p-6 flex gap-4 items-start">
                <div className="h-16 w-16 bg-emerald-800 border-2 border-emerald-400 rounded-xl shrink-0 flex items-center justify-center font-mono text-xl font-black text-white shadow-inner select-none overflow-hidden relative">
                  {capturedImage ? (
                    <img src={capturedImage} alt={member.name} className="h-full w-full object-cover" />
                  ) : (
                    member.name.split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase()
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-md font-sans font-bold leading-tight uppercase tracking-tight text-white">{member.name}</h3>
                  <p className="text-[10px] font-mono text-emerald-300">ID NO: <span className="text-white font-bold">{member.id}</span></p>
                  
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 border-t border-white/15 text-[10px] font-mono text-stone-300">
                    <div>
                      <p className="text-emerald-400/80 uppercase tracking-tight text-[8px]">Zone Status</p>
                      <p className="font-bold whitespace-nowrap">Brgy. {member.barangay}</p>
                    </div>
                    <div>
                      <p className="text-emerald-400/80 uppercase tracking-tight text-[8px]">Roster Status</p>
                      <p className="text-emerald-300 font-bold">✓ {member.status}</p>
                    </div>
                    <div>
                      <p className="text-emerald-400/80 uppercase tracking-tight text-[8px]">Farm Scale</p>
                      <p className="font-bold">{member.farmSizeHa} Hectares</p>
                    </div>
                    <div>
                      <p className="text-emerald-400/80 uppercase tracking-tight text-[8px]">Main Crops</p>
                      <p className="font-bold truncate">{Array.isArray(member.primaryCrops) ? member.primaryCrops.join(", ") : member.primaryCrops}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Barcode/Verification */}
              <div className="bg-emerald-950/80 p-3.5 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-emerald-300/80">
                <div>
                  <p className="tracking-widest uppercase font-bold text-white">Verified Coop Member Record</p>
                  <p>Certified Under Barangay Alegria</p>
                </div>
                {/* Simulated Barcode block */}
                <div className="flex gap-0.5 h-6 select-none items-stretch">
                  <span className="w-1.5 bg-emerald-400" />
                  <span className="w-0.5 bg-emerald-400" />
                  <span className="w-1 bg-emerald-400/50" />
                  <span className="w-0.5 bg-emerald-400" />
                  <span className="w-1.5 bg-emerald-400" />
                  <span className="w-0.5 bg-emerald-400" />
                  <span className="w-1.5 bg-emerald-400" />
                </div>
              </div>

            </div>

            {/* Instruction Desk & Custom Image Capture Controls */}
            <div className="shrink-0 w-full max-w-sm flex flex-col gap-4">
              {/* Direct Webcam Capture and Upload Suite */}
              <div className="bg-stone-100 border border-stone-200 rounded-xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
                  <Camera size={16} className="text-emerald-800 animate-pulse" />
                  <span className="text-xs font-bold text-stone-850 uppercase tracking-wider font-sans">
                    Member Photo settings
                  </span>
                </div>

                {isCameraActive ? (
                  <div className="space-y-3">
                    <div className="relative w-full aspect-square bg-stone-900 rounded-lg overflow-hidden flex items-center justify-center border border-stone-300">
                      <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay playsInline muted />
                      <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-full pointer-events-none flex items-center justify-center">
                        <span className="text-[9px] text-white font-mono tracking-widest bg-stone-950/80 px-2.5 py-1 rounded">ALIGN FACE</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-850 text-white font-extrabold text-xs py-2 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Camera size={13} /> Capture Frame
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs py-2 px-3 rounded-lg transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-stone-50 font-extrabold text-xs py-2 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="Activate live camera modal capture"
                      >
                        <Camera size={13} /> Use Device Camera
                      </button>
                      
                      <label className="flex-1 bg-stone-50 hover:bg-stone-200 text-stone-700 border border-stone-300 font-extrabold text-xs py-2 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer text-center">
                        <Upload size={13} /> Upload Image
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>

                    {capturedImage ? (
                      <div className="flex items-center justify-between bg-white border border-stone-200 p-2 rounded-lg text-xs animate-fade-in">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img src={capturedImage} alt="Preview" className="h-8 w-8 rounded object-cover border border-stone-200 shrink-0" />
                          <span className="text-stone-500 font-mono text-[10px] truncate">custom_image.jpg</span>
                        </div>
                        <button
                          type="button"
                          onClick={clearPhoto}
                          className="text-rose-700 hover:text-rose-950 font-sans font-bold flex items-center gap-1 cursor-pointer transition p-1 hover:bg-rose-50 rounded shrink-0"
                          title="Clear custom photo and restore AFA initials"
                        >
                          <Trash2 size={13} /> Clear
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-stone-500 italic text-center">
                        No custom photo loaded. Defaulting to Monogram Initials.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="text-xs leading-relaxed text-stone-600 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                <p className="font-bold text-stone-800 mb-1">Alegria Farmers Association Member Digipass benefits:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Present this digital ticket at Barangay Alegria distribution points to claim corn seed subsidies, sugarcane supplies, or LGU fertilizers.</li>
                  <li>Access raw cash books, historical general assembly resolutions, and the full active rosters of the cooperative transparently.</li>
                  <li>Alegria FAMS is built offline-first; this ID continues working instantly in rural highlands with zero internet connection.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Menu Navigation inside Member Portal */}
      <div className="flex border-b border-stone-200 mb-6 font-medium overflow-x-auto gap-1 no-print">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`pb-3 px-4 text-sm font-sans whitespace-nowrap transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "dashboard"
              ? "border-emerald-800 text-emerald-800 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Compass size={16} /> Member Dashboard
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`pb-3 px-4 text-sm font-sans whitespace-nowrap transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "announcements"
              ? "border-emerald-800 text-emerald-800 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Calendar size={16} /> Bulletins ({announcements.length})
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-3 px-4 text-sm font-sans whitespace-nowrap transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "products"
              ? "border-emerald-800 text-emerald-800 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Tag size={16} /> Showroom Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("meetings")}
          className={`pb-3 px-4 text-sm font-sans whitespace-nowrap transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "meetings"
              ? "border-emerald-800 text-emerald-800 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Users size={16} /> Historical Minutes ({meetings.length})
        </button>
        <button
          onClick={() => setActiveTab("finances")}
          className={`pb-3 px-4 text-sm font-sans whitespace-nowrap transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "finances"
              ? "border-emerald-800 text-emerald-800 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Landmark size={16} /> Certified Cash Book Ledger
        </button>
        <button
          onClick={() => setActiveTab("roster")}
          className={`pb-3 px-4 text-sm font-sans whitespace-nowrap transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "roster"
              ? "border-emerald-800 text-emerald-800 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Users size={16} /> Roster Directory
        </button>
      </div>

      {/* TAB CONTENT PANELS */}

      {/* Tab A: Member Dashboard overview (Bento grid style) */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Quick Stats Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Panel 1: Personal membership recap */}
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  My Profile
                </span>
                <p className="text-xl font-bold font-sans text-stone-900 mt-2">{member.name}</p>
                <p className="text-xs text-stone-500">Active status: <span className="font-semibold text-emerald-800">{member.status}</span></p>
                <div className="mt-3 space-y-1 text-xs font-mono text-stone-600">
                  <p>• Area Size: <strong>{member.farmSizeHa} Hectares</strong></p>
                  <p>• Principal crop: <strong>{Array.isArray(member.primaryCrops) ? member.primaryCrops[0] : member.primaryCrops}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintIDCard(true)}
                className="mt-4 text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 transition cursor-pointer"
              >
                Inspect official barcode badge <ChevronRight size={13} />
              </button>
            </div>

            {/* Panel 2: Verified Cash Book liquidity summary */}
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Association Reserves
                </span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-bold text-emerald-850">₱{netBalance.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-stone-500 mt-0.5 font-mono">
                  Gross Income: ₱{totalIncome.toLocaleString()} | Expenses: ₱{totalExpense.toLocaleString()}
                </p>
                <div className="mt-3 p-2 bg-emerald-50 border border-emerald-100 rounded text-[11px] text-emerald-900 leading-snug">
                  🛡️ certified and locked by the Auditor. All metrics are fully public and verified.
                </div>
              </div>
              <button
                onClick={() => setActiveTab("finances")}
                className="mt-4 text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 transition cursor-pointer"
              >
                Access cash flow ledger tables <ChevronRight size={13} />
              </button>
            </div>

            {/* Panel 3: Active assemblies review count */}
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Meetings & Resolutions
                </span>
                <p className="text-xl font-bold font-sans text-stone-900 mt-2">{meetings.length} General Assemblies</p>
                <p className="text-xs text-stone-500">Official minutes, participants count, and decisions made in real-time.</p>
                <div className="mt-3 space-y-1 text-xs text-stone-600">
                  <p className="line-clamp-2 italic">“{meetings[0]?.title || "No meetings logged yet."}”</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("meetings")}
                className="mt-4 text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 transition cursor-pointer"
              >
                Read assembly deliberations <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Core Welcome Announcement Banner */}
          <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-stone-100 rounded-xl p-6 shadow border border-emerald-700">
            <h3 className="text-lg font-bold font-sans">Active FAMS Transparent Governance</h3>
            <p className="text-emerald-100 text-xs leading-relaxed max-w-3xl mt-1.5">
              The Barangay Alegria Farmers Association Management System empowers cooperative structures. The internal dashboard was created exclusively for active members to audit rosters, verify expenditures, read secure general templates, and inspect historical minutes passed by executive desks. 
            </p>
            <div className="mt-4 flex gap-4 text-xs font-mono text-emerald-200">
              <p>📍 Tuburan, Cebu Primary Composting & Roasting Highland Station</p>
            </div>
          </div>

          {/* Quick Announcements feed */}
          <div className="space-y-3">
            <h4 className="text-sm font-mono font-bold text-stone-700 uppercase">Alegria Association Bulletins Highlight</h4>
            <div className="grid md:grid-cols-2 gap-6">
              {announcements.slice(0, 2).map((item) => (
                <div key={item.id} className="bg-white border border-stone-200 p-5 rounded-lg shadow-xs hover:border-emerald-300 transition">
                  <span className="text-[10px] bg-stone-100 text-stone-600 border font-mono px-2 py-0.5 rounded">{item.date}</span>
                  <h5 className="font-bold font-sans text-stone-900 text-md mt-2">{item.title}</h5>
                  <p className="text-xs text-stone-600 mt-1 pb-3 line-clamp-3 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                  <p className="text-[10px] font-mono text-stone-400 border-t border-stone-100 pt-2.5">Posted by Public Information Officer: {item.author}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab B: Announcements view */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-bold font-sans text-stone-900">Current Announcements & Bulletins</h3>
            <p className="text-xs text-stone-500 font-mono">Issued via AFA PIO Desk</p>
          </div>

          {announcements.length === 0 ? (
            <div className="bg-stone-50 rounded-xl p-8 text-center text-stone-500 border">No recent bulletins posted.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {announcements.map((item) => (
                <div key={item.id} className="bg-white border border-stone-200 hover:border-emerald-300 rounded-xl p-6 shadow-xs transition flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-md font-sans font-bold text-stone-900">{item.title}</h4>
                      <span className="text-xs bg-stone-100 border text-stone-600 font-mono whitespace-nowrap px-2 py-0.5 rounded">
                        {item.date}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed my-4 whitespace-pre-wrap">{item.content}</p>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-xs font-mono text-stone-500">
                    <span>Officer: {item.author}</span>
                    <span className="text-emerald-800 font-sans font-bold flex items-center gap-1">🟢 Official Bulletin</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab C: Product Showroom */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-bold font-sans text-stone-900">Cooperative Product Showroom</h3>
            <p className="text-xs text-stone-500 font-mono">List of items and prices offered directly by registered members</p>
          </div>

          {products.length === 0 ? (
            <div className="bg-stone-50 rounded-xl p-8 text-center text-stone-500 border">No product listings recorded.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <div key={p.id} className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs hover:border-emerald-500 transition flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2 gap-2">
                      <h4 className="font-bold text-stone-900 font-sans tracking-tight line-clamp-1">{p.name}</h4>
                      <span className="text-lg font-mono font-bold text-emerald-800">₱{p.price}</span>
                    </div>
                    <p className="text-xs bg-emerald-50 text-emerald-990 font-mono px-2 py-0.5 rounded inline-block mb-3">
                      Supply: {p.quantity}
                    </p>
                    <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap line-clamp-4 min-h-[60px]">{p.description}</p>
                  </div>
                  <div className="border-t pt-3 mt-4 text-xs font-mono text-stone-500 space-y-1">
                    <p><strong>Contact Point:</strong> {p.contact}</p>
                    <p><strong>Posted by:</strong> {p.postedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab D: Historical Assemblies (Meetings) */}
      {activeTab === "meetings" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-lg font-bold font-sans text-stone-900">Historical Assembly Minutes & Association Decisions</h3>
              <p className="text-xs text-stone-500 font-mono">Deliberations and official general assembly resolutions of AFA.</p>
            </div>
            <span className="text-xs bg-stone-100 border text-stone-700 px-3 py-1 rounded font-mono font-bold font-sans uppercase">
              Member Verified log
            </span>
          </div>

          {meetings.length === 0 ? (
            <div className="bg-stone-50 rounded-xl p-8 text-center text-stone-500 border">No meeting minutes registered in the caching systems.</div>
          ) : (
            <div className="space-y-6">
              {meetings.map((m) => (
                <div key={m.id} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-4">
                    <div>
                      <span className="text-xs text-emerald-800 font-mono font-bold uppercase tracking-wider">{m.id}</span>
                      <h4 className="text-lg font-sans font-bold text-stone-900">{m.title}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-stone-500">
                      <span>Assemble Date: {m.date}</span>
                      <span>•</span>
                      <span>Validated Attendees: {m.attendeesCount} farmers</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-xs font-mono font-bold text-stone-700 uppercase mb-1">Deliberation Summary Minutes:</h5>
                      <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap font-sans">{m.minutes}</p>
                    </div>

                    {m.resolutions && m.resolutions.length > 0 && (
                      <div className="bg-emerald-50/55 p-4 rounded-lg border border-emerald-100">
                        <h5 className="text-xs font-mono font-bold text-emerald-990 uppercase mb-2">Approved Cooperative Resolutions:</h5>
                        <ul className="list-disc pl-5 text-sm text-stone-700 space-y-1.5 font-sans">
                          {m.resolutions.map((res, idx) => (
                            <li key={idx}>{res}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-stone-100 pt-3 mt-4 text-xs font-mono text-stone-400 text-right">
                    Recorded & Certified by: {m.recordedBy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab E: Finances table */}
      {activeTab === "finances" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b pb-2">
            <div>
              <h3 className="text-lg font-bold font-sans text-stone-900">Certified Digital Cash Book & Auditor ledger</h3>
              <p className="text-xs text-stone-500 font-mono">Stream of gross income in-flow, subsidies, and overhead expenses.</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-3 py-1 rounded font-sans">
              Liquid Balance: ₱{netBalance.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-lg text-emerald-990">
              <span className="text-xs font-mono uppercase">Gross Received Income</span>
              <p className="text-xl font-mono font-bold text-emerald-700 mt-1">₱{totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-lg text-rose-950">
              <span className="text-xs font-mono uppercase">Gross Paid Expenses</span>
              <p className="text-xl font-mono font-bold text-rose-700 mt-1">₱{totalExpense.toLocaleString()}</p>
            </div>
            <div className="bg-stone-50 border border-stone-200 p-4 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase text-stone-500 font-bold">Auditor Review Seal</span>
                <p className="text-[10px] text-emerald-800 font-bold font-mono mt-1">✓ UNIFORM ACCURACY CONFIRMED</p>
              </div>
              <ShieldCheck className="text-emerald-700 shrink-0" size={28} />
            </div>
          </div>

          {cashflow.length === 0 ? (
            <div className="bg-stone-50 rounded-xl p-8 text-center text-stone-500 border">No receipts registered.</div>
          ) : (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-stone-100 border-b text-xs font-mono text-stone-600 uppercase">
                      <th className="p-3">Ref ID</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashflow.map((entry) => (
                      <tr key={entry.id} className="border-b text-stone-700 hover:bg-stone-50 select-text">
                        <td className="p-3 font-mono text-xs text-stone-400">{entry.id}</td>
                        <td className="p-3 font-mono whitespace-nowrap">{entry.date}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            entry.type === "Income"
                              ? "bg-emerald-100 text-emerald-850 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="p-3 font-sans font-bold text-stone-850">{entry.category}</td>
                        <td className="p-3 text-stone-500 max-w-xs truncate">{entry.description}</td>
                        <td className={`p-3 text-right font-mono font-bold ${
                          entry.type === "Income" ? "text-emerald-700" : "text-rose-700"
                        }`}>
                          {entry.type === "Income" ? "+" : "-"} ₱{entry.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab F: All registered members block */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-2">
            <div>
              <h3 className="text-lg font-bold font-sans text-stone-900">Cooperative Registered Roster Directory</h3>
              <p className="text-xs text-stone-500 font-mono">List of active members across Barangay Alegria of Tuburan, Cebu.</p>
            </div>
            
            <div className="relative w-full md:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search name, ID or barangay..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg pl-9 p-2 text-xs text-stone-900 outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
              />
            </div>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-stone-100 border-b text-xs font-mono text-stone-650 uppercase">
                    <th className="p-3">Ref ID</th>
                    <th className="p-3">Farmer Name</th>
                    <th className="p-3">Demographics</th>
                    <th className="p-3">Barangay</th>
                    <th className="p-3 font-mono text-xs">Farm Size</th>
                    <th className="p-3">Primary Crop</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-stone-400">
                        No registered members fit your search.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => (
                      <tr key={m.id} className="border-b text-stone-700 hover:bg-stone-50">
                        <td className="p-3 font-mono text-xs text-stone-400">{m.id}</td>
                        <td className="p-3 font-sans font-bold text-stone-900">{m.name}</td>
                        <td className="p-3 text-xs font-mono text-stone-500">{m.gender}, {m.age} y/o</td>
                        <td className="p-3 text-stone-600">{m.barangay}</td>
                        <td className="p-3 font-mono text-xs text-stone-650">{m.farmSizeHa || 1.0} Ha</td>
                        <td className="p-3 text-xs text-stone-600">
                          <span className="flex flex-wrap gap-1">
                            {Array.isArray(m.primaryCrops) 
                              ? m.primaryCrops.map((c, i) => (
                                  <span key={i} className="bg-emerald-50 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded border border-emerald-100 font-medium">
                                    {c}
                                  </span>
                                ))
                              : <span className="bg-emerald-50 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded border border-emerald-100 font-medium">{m.primaryCrops}</span>
                            }
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                            m.status === "Active" ? "bg-emerald-100 text-emerald-800 border" : "bg-rose-100 text-rose-800 border"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-16 text-center border-t border-stone-200 pt-8 text-xs text-stone-400 font-mono select-none no-print">
        <p>Alegria Farmers Association FAMS Member Workspace. All rights reserved © 2026.</p>
      </div>
    </div>
  );
}
