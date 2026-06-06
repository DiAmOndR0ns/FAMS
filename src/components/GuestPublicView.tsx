import React, { useState } from "react";
import { Announcement, Product } from "../types";
import {
  Calendar,
  Tag,
  Users,
  Award,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Compass,
  MapPin,
  ChevronRight,
  Sparkles,
  PhoneCall
} from "lucide-react";

interface GuestPublicViewProps {
  announcements: Announcement[];
  products: Product[];
  onLoginClick: () => void;          // Officer Login Panel trigger
  onMemberPortalClick: () => void;    // Member verification panel trigger
}

export default function GuestPublicView({
  announcements,
  products,
  onLoginClick,
  onMemberPortalClick
}: GuestPublicViewProps) {
  const [activeTab, setActiveTab] = useState<"about" | "announcements" | "showroom" | "board">("about");

  // Realistic mock data of the Board of Directors & Officers matching pre-defined accounts
  const OFFICERS = [
    {
      role: "President",
      name: "Zenaida A. Elbiña",
      title: "President & Association Chairwoman",
      contact: "zenaida.elbina@afa-tuburan.org",
      dept: "Executive Governance & External Relations",
      bio: "Leads the executive board, coordinates with government agricultural units, and signs off on funding delegations."
    },
    {
      role: "Vice President",
      name: "Anselna B Arnado",
      title: "Vice President & Operations Overseer",
      contact: "anselna.arnado@afa-tuburan.org",
      dept: "Operations & Sustainable Farming Tracts",
      bio: "Supervises highland cultivation tracts, monitors cooperative equipment allocations, and assumes president administrative tasks under delegation."
    },
    {
      role: "Secretary",
      name: "Jennylyn S Lumactao",
      title: "Association Board Secretary",
      contact: "jennylyn.lumactao@afa-tuburan.org",
      dept: "Roster Management & Legal Minutes",
      bio: "Manages rosters, seals general assembly deliberations, registers new farmer members, and archives administrative resolutions."
    },
    {
      role: "Assistant Secretary",
      name: "Joan A Cebas",
      title: "Assistant Board Secretary",
      contact: "joan.cebas@afa-tuburan.org",
      dept: "Roster Management & Record Keeping",
      bio: "Supports the Board Secretary with registration drives, maintains agricultural logbooks, and documents roster updates."
    },
    {
      role: "Treasurer",
      name: "Gracelyn P Asendiente",
      title: "Chief Treasurer & Cash Custodian",
      contact: "gracelyn.asendiente@afa-tuburan.org",
      dept: "Finance Management & Cash Book Control",
      bio: "Oversees local cooperative cash boxes, logs membership dues, allocates fertilizer subsidies, and balances expenditures."
    },
    {
      role: "Assistant Treasurer",
      name: "Ana Lourdes D Pasaylo",
      title: "Assistant Board Treasurer",
      contact: "ana.pasaylo@afa-tuburan.org",
      dept: "Financial Records & Subsidies Management",
      bio: "Assists the Chief Treasurer in backing up ledgers, managing activity grants, processing cash books, and safeguarding funds."
    },
    {
      role: "Auditor",
      name: "Lorena B Pinote",
      title: "Internal Auditor & Compliance Seal",
      contact: "lorena.pinote@afa-tuburan.org",
      dept: "Financial Oversight & Audits Review",
      bio: "Performs weekly balance audits, certifies digital transaction ledgers, and compiles raw transparent compliance sheets."
    },
    {
      role: "PIO",
      name: "Ida S Manera",
      title: "Public Information Officer (PIO 1)",
      contact: "public.info@afa-tuburan.org",
      dept: "Bulletins, Showroom & Community Outreach",
      bio: "Publishes bulletins, drafts announcements, organizes local cooperative showcase events, and acts as marketing coordinator."
    },
    {
      role: "PIO",
      name: "Rosalinda G Bangga",
      title: "Public Information Officer (PIO 2)",
      contact: "rosalinda.bangga@afa-tuburan.org",
      dept: "Information Dissemination & Public Relations",
      bio: "Maintains official circulars, communicates agricultural schedules to remote sectors, and handles community relations."
    }
  ];

  const BOARD_OF_DIRECTORS = [
    { name: "Silvestra S. Simbajon", title: "Board of Director (BOD)" },
    { name: "Diosdada M. Asendiente", title: "Board of Director (BOD)" },
    { name: "Mirasol E. Tan", title: "Board of Director (BOD)" },
    { name: "Romalina S. Evero", title: "Board of Director (BOD)" },
    { name: "Judeline G. Romero", title: "Board of Director (BOD)" }
  ];

  // Association Achievements Timeline
  const TIMELINE_ACHIEVEMENTS = [
    {
      year: "2023",
      title: "AFA Founding",
      desc: "Incorporated with 50 local growers to establish Barangay Alegria as the highland Robusta roasting station of Tuburan, Cebu."
    },
    {
      year: "2024",
      title: "DA Fertilizer Subsidy Partnership",
      desc: "Secured persistent Department of Agriculture subsidies, distributing over 300+ bags of organic soil booster conditioner to all active members."
    },
    {
      year: "2025",
      title: "Digital FAMS Collaboration Initiative",
      desc: "Partnered with local technical developers to transition from traditional manual notebooks to offline-first FAMS Web."
    },
    {
      year: "2026",
      title: "100% Digital Transition Achievement",
      desc: "Launched transparent ledger verification, establishing absolute digital bookkeeping with permanent roles audit trails."
    }
  ];

  return (
    <div id="guest-public-container" className="max-w-7xl mx-auto px-4 py-8 font-sans selection:bg-emerald-250">
      
      {/* Institutional Letterhead Header */}
      <div id="header-institutional" className="border-b-2 border-emerald-800 pb-6 mb-8 text-center md:text-left md:flex md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="bg-emerald-850 text-stone-50 p-3 rounded-2xl font-mono text-xl font-bold tracking-wider shadow border border-emerald-700">
            AFA
          </div>
          <div>
            <p className="text-[10px] font-mono tracking-widest text-emerald-800 font-bold uppercase">REPUBLIC OF THE PHILIPPINES</p>
            <h1 className="text-2xl font-sans font-black text-stone-900 tracking-tight">Alegria Farmers Association (AFA)</h1>
            <p className="text-xs text-stone-500 font-mono flex items-center justify-center md:justify-start gap-1 gap-y-0.5 mt-0.5">
              <MapPin size={12} className="text-emerald-700" /> Barangay Alegria, Municipality of Tuburan, Cebu
            </p>
          </div>
        </div>

        {/* Portal Switching buttons */}
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2 justify-center">
          <button
            id="member-portal-btn"
            onClick={onMemberPortalClick}
            className="bg-emerald-800 hover:bg-emerald-900 text-stone-50 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer border border-emerald-700"
          >
            <Users size={14} /> Enter Member Portal
          </button>
          
          <button
            id="login-btn-guest"
            onClick={onLoginClick}
            className="bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold px-4 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck size={14} className="text-emerald-800" /> Administrative Officer Gate
          </button>
        </div>
      </div>

      {/* Hero Welcome Info banner */}
      <div className="bg-gradient-to-r from-emerald-850 to-emerald-950 text-stone-100 rounded-xl p-6 md:p-8 mb-8 shadow-lg border border-emerald-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles size={180} />
        </div>
        <div className="relative z-10">
          <div className="inline-block bg-emerald-700 text-emerald-100 font-mono text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mb-3">
            Public Information Hub
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-2 max-w-xl">Farmers Association Management System</h2>
          <p className="text-emerald-100 text-sm max-w-3xl leading-relaxed mb-6">
            Welcome to the public face of Barangay Alegria Farmers Association (AFA). Nestled inside the highlands of Tuburan, Cebu, our collective is pioneering cooperative sugarcane, corn, and organic Robusta coffee farming. This platform operates offline-first to bring digital transparency, bullet bulletins, and listed showroom directories directly to our local agricultural ecosystem.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onMemberPortalClick}
              className="bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold px-5 py-2.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow"
            >
              Are you an Active Member? Access your Digipass <ArrowRight size={14} />
            </button>
            <button
              onClick={() => setActiveTab("board")}
              className="bg-emerald-800/80 text-white border border-emerald-700 hover:bg-emerald-800 text-xs font-bold px-5 py-2.5 rounded-lg transition cursor-pointer"
            >
              Audit AFA Board of Directors
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation for Restricted Visitors */}
      <div className="flex border-b border-stone-200 mb-6 font-medium overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("about")}
          className={`pb-3 px-4 text-sm font-sans whitespace-nowrap transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "about"
              ? "border-emerald-800 text-emerald-800 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Compass size={16} /> Organization, History & Achievements
        </button>
        <button
          onClick={() => setActiveTab("board")}
          className={`pb-3 px-4 text-sm font-sans whitespace-nowrap transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "board"
              ? "border-emerald-800 text-emerald-800 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Users size={16} /> Board of Directors Directory
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`pb-3 px-4 text-sm font-sans whitespace-nowrap transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "announcements"
              ? "border-emerald-800 text-emerald-800 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Calendar size={16} /> Bulletins & Announcements ({announcements.length})
        </button>
        <button
          onClick={() => setActiveTab("showroom")}
          className={`pb-3 px-4 text-sm font-sans whitespace-nowrap transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "showroom"
              ? "border-emerald-800 text-emerald-800 font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Tag size={16} /> Product Showroom Catalog ({products.length})
        </button>
      </div>

      {/* TAB CONTENT PANELS */}

      {/* Tab 1: Organization Details, Mission, Timeline */}
      {activeTab === "about" && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Mission and Vision Grid split */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 p-6 rounded-xl shadow-xs">
              <div className="bg-emerald-50 text-emerald-800 h-10 w-10 rounded-lg flex items-center justify-center mb-3">
                <BookOpen size={18} />
              </div>
              <h4 className="text-md font-sans font-extrabold text-stone-950 uppercase tracking-tight">Our Mission</h4>
              <p className="text-stone-600 text-xs leading-relaxed mt-2">
                To uplift Barangay Alegria farmers by providing centralized offline-first technology platforms, ensuring immediate ledger transparency, pooling fertilizer resources, and scaling our premium highland Robusta coffee bean distribution to increase individual grower profitability.
              </p>
            </div>

            <div className="bg-white border border-stone-200 p-6 rounded-xl shadow-xs">
              <div className="bg-emerald-50 text-emerald-800 h-10 w-10 rounded-lg flex items-center justify-center mb-3">
                <Award size={18} />
              </div>
              <h4 className="text-md font-sans font-extrabold text-stone-950 uppercase tracking-tight">Our Vision</h4>
              <p className="text-stone-600 text-xs leading-relaxed mt-2">
                A highly unified, digitized, and resilient agricultural cooperative in Tuburan, Cebu, leveraging local digital research to uphold structural audit integrity, eliminating manual paper record friction under rural infrastructure challenges.
              </p>
            </div>
          </div>

          {/* Timeline of Achievements */}
          <div className="bg-white border border-stone-200 p-6 md:p-8 rounded-xl shadow-xs">
            <h4 className="text-lg font-bold text-stone-950 mb-1 font-sans">Alegria Association Chronology & Key Achievements</h4>
            <p className="text-xs text-stone-500 font-mono mb-6 pb-4 border-b">Historical milestones verified under public records</p>
            
            <div className="relative border-l border-stone-200 ml-3 space-y-8">
              {TIMELINE_ACHIEVEMENTS.map((item, idx) => (
                <div key={idx} className="relative pl-6">
                  {/* Timeline point indicator */}
                  <div className="absolute -left-1.5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-emerald-800 bg-white" />
                  <div>
                    <span className="text-xs bg-emerald-50 border text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-md">
                      {item.year}
                    </span>
                    <h5 className="font-bold text-stone-900 text-sm mt-1.5 font-sans">{item.title}</h5>
                    <p className="text-stone-600 text-xs mt-1 leading-relaxed max-w-2xl">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>



        </div>
      )}

      {/* Tab 2: Board of Directors Directory */}
      {activeTab === "board" && (
        <div className="space-y-10 animate-fade-in">
          <div>
            <h3 className="text-lg font-sans font-bold text-stone-900">Cooperative Board of Directors & Officers</h3>
            <p className="text-xs text-stone-400 font-mono">Official executive directory of the Alegria Farmers Association (AFA)</p>
          </div>

          {/* Section A: Executive Officers */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-800 border-b pb-2">Cooperative Officers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {OFFICERS.map((officer, i) => (
                <div key={i} className="bg-white border border-stone-200 hover:border-emerald-300 rounded-xl p-5 shadow-xs transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b pb-3 mb-3">
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm font-sans">{officer.name}</h4>
                        <p className="text-[10px] font-mono text-emerald-800 uppercase font-bold tracking-tight mt-0.5">{officer.title}</p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        {officer.name.split(" ").map(n => n[0]).join("").substring(0, 3).toUpperCase()}
                      </div>
                    </div>
                    <div className="space-y-2 text-xs font-sans text-stone-600">
                      <p><strong className="text-stone-850">Assigned Section:</strong> {officer.dept}</p>
                      <p className="leading-relaxed italic mt-1 font-medium">{officer.bio}</p>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-stone-100 pt-3 mt-4 flex items-center text-[10px] font-mono text-stone-400 gap-1.5">
                    <PhoneCall size={11} className="text-emerald-800" />
                    <span>Channel: {officer.contact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Board of Directors (BOD) */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-800 border-b pb-2">Board of Directors (BOD)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BOARD_OF_DIRECTORS.map((bod, idx) => (
                <div key={idx} className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
                  <div className="h-9 w-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-mono text-xs font-black shrink-0">
                    BOD{(idx + 1).toString()}
                  </div>
                  <div>
                    <h5 className="font-bold text-stone-900 text-xs font-sans uppercase tracking-tight">{bod.name}</h5>
                    <p className="text-[10px] text-stone-500 font-mono mt-0.5">{bod.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center text-xs text-emerald-900 leading-relaxed max-w-2xl mx-auto mt-4">
            🙋 Have questions regarding seed distribution schedules or membership applications? You can reach any active officer under their designated desk contact channels listed above.
          </div>
        </div>
      )}

      {/* Tab 3: Announcements bulletin board */}
      {activeTab === "announcements" && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h3 className="text-lg font-sans font-bold text-stone-900">Current Announcements & Bulletins</h3>
            <p className="text-xs text-stone-400 font-mono">Cooperative releases regarding distribution programs, subsidy forms, and assembly schedules</p>
          </div>

          {announcements.length === 0 ? (
            <div className="bg-stone-50 rounded-xl p-8 text-center text-stone-500 border">
              No recent announcements or bulletins published.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {announcements.map((item) => (
                <div key={item.id} className="bg-white border border-stone-200 hover:border-emerald-300 rounded-xl p-6 shadow-xs flex flex-col justify-between transition">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-md font-sans font-bold text-stone-900">{item.title}</h4>
                      <span className="text-xs bg-stone-100 border text-stone-600 font-mono whitespace-nowrap px-2 py-0.5 rounded">
                        {item.date}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed my-4 whitespace-pre-wrap">{item.content}</p>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-[11px] font-mono text-stone-500">
                    <span>Officer: {item.author}</span>
                    <span className="text-emerald-800 font-sans font-bold">🟢 Official Bulletins Board</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Product Showroom */}
      {activeTab === "showroom" && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h3 className="text-lg font-sans font-bold text-stone-900">Cooperative Products Showcase Catalog</h3>
            <p className="text-xs text-stone-400 font-mono">Organic Robusta highland coffee beans and farm soil conditioners produced directly by Alegria cooperative growers</p>
          </div>

          {products.length === 0 ? (
            <div className="bg-stone-50 rounded-xl p-8 text-center text-stone-500 border">
              No product items posted at this time.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <div key={p.id} className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col justify-between shadow-xs hover:border-emerald-500 transition">
                  <div>
                    <div className="flex justify-between items-center mb-2 gap-2">
                      <h4 className="font-bold font-sans text-stone-900 tracking-tight line-clamp-1">{p.name}</h4>
                      <span className="text-lg font-mono font-bold text-emerald-800">₱{p.price}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-990 font-mono px-2.5 py-0.5 rounded border border-emerald-100 mb-3 inline-block">
                      Supply level: {p.quantity}
                    </span>
                    <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap line-clamp-4 min-h-[60px]">{p.description}</p>
                  </div>
                  <div className="border-t border-stone-100 pt-3 mt-4 text-[11px] font-mono text-stone-500 space-y-1">
                    <p><strong className="text-stone-700">Contact Point:</strong> {p.contact}</p>
                    <p><strong className="text-stone-700">Listers Desk:</strong> {p.postedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div className="mt-16 text-center border-t border-stone-200 pt-8 text-xs text-stone-400 font-mono select-none">
        <p>Barangay Alegria Farmers Association Public Platform Hub. All rights reserved © 2026.</p>
      </div>

    </div>
  );
}
