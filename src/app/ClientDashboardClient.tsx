"use client";

import { useEffect, useState } from "react";
import { Form, FormField } from "@/lib/formService";
import { logoutClient, updateReceiverEmails, ClientSession, getClientLeads, deleteClientLead } from "@/app/actions/clientAuth";
import { useRouter } from "next/navigation";
import { LogOut, Download, Search, Eye, Trash2, X, Code, Copy, Mail, ShieldAlert, Check, ExternalLink, Settings, Loader2 } from "lucide-react";

interface ClientDashboardClientProps {
  session: ClientSession;
  initialForms: Form[];
}

export default function ClientDashboardClient({ session, initialForms }: ClientDashboardClientProps) {
  const router = useRouter();
  const [forms] = useState<Form[]>(initialForms);
  const [selectedFormId, setSelectedFormId] = useState<string>(
    session.isSuperAdmin && initialForms.length > 0 ? initialForms[0].id : session.formId
  );
  
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Email Config State
  const [receiverEmails, setReceiverEmails] = useState("");
  const [updatingEmails, setUpdatingEmails] = useState(false);
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState(false);

  // Tab State
  const [activeMenuTab, setActiveMenuTab] = useState<"leads" | "settings" | "embed">("leads");
  
  // Integration Tab State
  const [activeCodeTab, setActiveCodeTab] = useState<"iframe" | "html" | "react" | "php">("iframe");
  const [copied, setCopied] = useState(false);

  const selectedForm = forms.find(f => f.id === selectedFormId);

  // Load Leads & Initialize Email input when active form changes
  useEffect(() => {
    if (!selectedFormId || selectedFormId === "all") {
      setLeads([]);
      setReceiverEmails("");
      return;
    }

    async function fetchLeads() {
      setLoadingLeads(true);
      try {
        const fetchedLeads = await getClientLeads(selectedFormId);
        setLeads(fetchedLeads);
      } catch (err) {
        console.error("Error loading leads:", err);
      } finally {
        setLoadingLeads(false);
      }
    }
    fetchLeads();

    if (selectedForm) {
      setReceiverEmails(selectedForm.emailSettings?.receiverEmails || "");
    }
  }, [selectedFormId, selectedForm]);

  const handleLogout = async () => {
    await logoutClient();
    router.push("/login");
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    setDeleting(id);
    try {
      const res = await deleteClientLead(selectedFormId, id);
      if (res.success) {
        setLeads(leads.filter(l => l.id !== id));
        if (selectedLead?.id === id) setSelectedLead(null);
      } else {
        alert(res.error || "Failed to delete lead");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete lead");
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateEmails = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingEmails(true);
    setEmailUpdateSuccess(false);

    try {
      const res = await updateReceiverEmails(selectedFormId, receiverEmails);
      if (res.success) {
        setEmailUpdateSuccess(true);
        // Update local form settings state
        const formIndex = forms.findIndex(f => f.id === selectedFormId);
        if (formIndex > -1) {
          forms[formIndex].emailSettings.receiverEmails = receiverEmails;
        }
      } else {
        alert(res.error || "Failed to update notification recipients.");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setUpdatingEmails(false);
    }
  };

  // Search filter
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const searchString = JSON.stringify(lead.data || {}).toLowerCase();
    const dateString = new Date(lead.createdAt).toLocaleDateString().toLowerCase();
    return searchString.includes(searchTerm.toLowerCase()) || dateString.includes(searchTerm.toLowerCase());
  });

  const exportCSV = () => {
    if (!selectedForm || filteredLeads.length === 0) return;
    const sortedFields = [...selectedForm.fields].sort((a, b) => a.order - b.order);
    const headers = ["Submission Date", "Status", ...sortedFields.map(f => f.label)];
    const rows = filteredLeads.map(lead => {
      const date = new Date(lead.createdAt).toLocaleString();
      const status = lead.status || "new";
      const fieldValues = sortedFields.map(field => {
        const val = lead.data?.[field.name];
        const parsedVal = typeof val === "boolean" 
          ? (val ? "Yes" : "No") 
          : val !== undefined && val !== null 
            ? val.toString() 
            : "";
        return `"${parsedVal.replace(/"/g, '""')}"`;
      });
      return [date, status, ...fieldValues].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedForm.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Integration Snippet Generator
  const getEmbedCode = () => {
    if (!selectedForm) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
    const iframeUrl = `${origin}/f/${selectedForm.id}`;
    const apiUrl = `${origin}/api/submit/${selectedForm.id}`;

    switch (activeCodeTab) {
      case "iframe":
        return `<iframe src="${iframeUrl}" width="100%" height="550" frameborder="0" style="border:none; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.05); min-width:320px;"></iframe>`;
      case "html":
        return `<form id="embed-form-${selectedForm.id}">
  <!-- Fields -->
${selectedForm.fields.map(f => `  <div style="margin-bottom: 12px;">
    <label style="display:block; font-weight:bold; margin-bottom:4px; font-family:sans-serif;">${f.label}${f.required ? ' *' : ''}</label>
    ${f.type === 'textarea' 
      ? `<textarea name="${f.name}" ${f.required ? 'required' : ''} style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:sans-serif;"></textarea>` 
      : f.type === 'select' 
        ? `<select name="${f.name}" ${f.required ? 'required' : ''} style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:sans-serif;">\n      <option value="">Select option...</option>\n      ${f.options?.map(o => `<option value="${o}">${o}</option>`).join('\n      ') || ''}\n    </select>`
        : f.type === 'checkbox'
          ? `<input type="checkbox" name="${f.name}" ${f.required ? 'required' : ''} style="margin-right:6px;" /> ${f.label}`
          : `<input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:sans-serif;" />`
    }
  </div>`).join('\n')}
  <button type="submit" style="padding:10px 20px; background-color:#026aa2; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-family:sans-serif;">Submit</button>
</form>`;
      case "react":
        return `// React component calling ${apiUrl}`;
      case "php":
        return `// PHP Integration for form submission to ${apiUrl}`;
    }
  };

  const copyToClipboard = () => {
    const code = getEmbedCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-main)" }}>
      {/* Top Navbar */}
      <header style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-card)", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              Aero Form Builder
              {session.isSuperAdmin && (
                <span style={{ fontSize: "0.75rem", backgroundColor: "var(--danger)", color: "white", padding: "0.15rem 0.5rem", borderRadius: "1rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  <ShieldAlert size={12} /> Super Admin
                </span>
              )}
            </h1>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>Client Management Portal</p>
          </div>
          
          {/* Form ID Select Dropdown for Super Admin */}
          {session.isSuperAdmin && forms.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "1rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Form ID:</span>
              <select
                className="form-input"
                style={{ padding: "0.4rem 2rem 0.4rem 1rem", fontSize: "0.85rem", marginBottom: 0 }}
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
              >
                {forms.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Welcome, <strong>{session.username}</strong> {!session.isSuperAdmin && `(Form ID: ${session.formId})`}
          </span>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="container" style={{ padding: "2rem 1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {forms.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <h3>No Forms Available</h3>
            <p>Wait for the administrator to deploy and configure a form workspace for you.</p>
          </div>
        ) : !selectedForm ? (
          <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <h3>Form Not Configured</h3>
            <p>The selected Form ID cannot be located in the database records.</p>
          </div>
        ) : (
          <>
            {/* Menu Tabs */}
            <div style={{ display: "flex", borderBottom: "2px solid var(--border)" }}>
              <button
                onClick={() => setActiveMenuTab("leads")}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "none",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: "pointer",
                  color: activeMenuTab === "leads" ? "var(--primary)" : "var(--text-secondary)",
                  borderBottom: activeMenuTab === "leads" ? "2px solid var(--primary)" : "none",
                  marginBottom: "-2px"
                }}
              >
                Leads Log ({leads.length})
              </button>
              <button
                onClick={() => setActiveMenuTab("settings")}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "none",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: "pointer",
                  color: activeMenuTab === "settings" ? "var(--primary)" : "var(--text-secondary)",
                  borderBottom: activeMenuTab === "settings" ? "2px solid var(--primary)" : "none",
                  marginBottom: "-2px"
                }}
              >
                Email Settings
              </button>
              <button
                onClick={() => setActiveMenuTab("embed")}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "none",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: "pointer",
                  color: activeMenuTab === "embed" ? "var(--primary)" : "var(--text-secondary)",
                  borderBottom: activeMenuTab === "embed" ? "2px solid var(--primary)" : "none",
                  marginBottom: "-2px"
                }}
              >
                Integrations
              </button>
            </div>

            {/* TAB CONTENT: LEADS LOG */}
            {activeMenuTab === "leads" && (
              <div className="card animate-fade-in" style={{ padding: 0 }}>
                {/* Search Header */}
                <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ position: "relative", width: "100%", maxWidth: "350px" }}>
                    <div style={{ position: "absolute", top: "50%", left: "1rem", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>
                      <Search size={18} />
                    </div>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Search leads..." 
                      style={{ paddingLeft: "2.75rem", marginBottom: 0 }}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {filteredLeads.length > 0 && (
                    <button onClick={exportCSV} className="btn btn-secondary">
                      <Download size={18} /> Export CSV
                    </button>
                  )}
                </div>

                {/* Table render */}
                {loadingLeads ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                    <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    No matching leads found for &quot;{selectedForm.name}&quot;.
                  </div>
                ) : (
                  <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          {/* Map first 3 dynamic columns */}
                          {[...selectedForm.fields].sort((a, b) => a.order - b.order).slice(0, 3).map(field => (
                            <th key={field.id}>{field.label}</th>
                          ))}
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.map(lead => {
                          const sortedFields = [...selectedForm.fields].sort((a, b) => a.order - b.order).slice(0, 3);
                          return (
                            <tr key={lead.id}>
                              <td>
                                <div style={{ fontWeight: 500 }}>{new Date(lead.createdAt).toLocaleDateString()}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                  {new Date(lead.createdAt).toLocaleTimeString()}
                                </div>
                              </td>
                              {sortedFields.map(field => {
                                const val = lead.data?.[field.name];
                                const displayVal = typeof val === "boolean"
                                  ? (val ? "Yes" : "No")
                                  : val !== undefined && val !== null
                                    ? val.toString()
                                    : "-";
                                return (
                                  <td key={field.id}>
                                    <div style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {displayVal}
                                    </div>
                                  </td>
                                );
                              })}
                              <td>
                                <span style={{ 
                                  padding: "0.25rem 0.75rem", 
                                  backgroundColor: lead.status === "new" ? "var(--primary-light)" : "var(--bg-main)",
                                  color: lead.status === "new" ? "var(--primary)" : "var(--text-secondary)",
                                  borderRadius: "1rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 600
                                }}>
                                  {lead.status || "New"}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                                  <button onClick={() => setSelectedLead(lead)} className="btn btn-secondary" style={{ padding: "0.5rem", border: "none" }} title="View Details">
                                    <Eye size={18} />
                                  </button>
                                  <button onClick={() => handleDeleteLead(lead.id)} className="btn btn-secondary" style={{ padding: "0.5rem", border: "none", color: "var(--danger)" }} title="Delete Lead" disabled={deleting === lead.id}>
                                    {deleting === lead.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SMTP CONFIGURATION */}
            {activeMenuTab === "settings" && (
              <div className="card animate-fade-in" style={{ padding: "2rem" }}>
                <h3 style={{ marginBottom: "0.5rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Mail size={22} /> Notification Settings
                </h3>
                <p style={{ marginBottom: "2rem", color: "var(--text-secondary)" }}>
                  Change the email addresses where form alerts are sent. When an end user submits your embedded form, emails will instantly propagate to these recipients.
                </p>

                <form onSubmit={handleUpdateEmails} style={{ maxWidth: "600px" }}>
                  {emailUpdateSuccess && (
                    <div style={{
                      backgroundColor: "var(--primary-light)",
                      color: "var(--primary)",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-md)",
                      marginBottom: "1.5rem",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}>
                      <Check size={18} />
                      <span>Recipients list updated successfully.</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label" htmlFor="receiverEmails">Recipient Email Addresses</label>
                    <input
                      type="text"
                      id="receiverEmails"
                      className="form-input"
                      value={receiverEmails}
                      onChange={(e) => {
                        setReceiverEmails(e.target.value);
                        setEmailUpdateSuccess(false);
                      }}
                      placeholder="e.g. sales@yourdomain.com, support@yourdomain.com"
                      required
                    />
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                      Separate multiple email addresses with commas.
                    </span>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem", minWidth: "150px" }} disabled={updatingEmails}>
                    {updatingEmails ? <><Loader2 className="animate-spin" size={16}/> Saving...</> : "Save Settings"}
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: EMBED INTEGRATIONS */}
            {activeMenuTab === "embed" && (
              <div className="card animate-fade-in" style={{ padding: "2rem" }}>
                <h3>Integrations & Embed Codes</h3>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>Copy snippets to install this form directly on WordPress, custom React, JS or PHP pages.</p>
                
                {/* Embedded tabs */}
                <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: "1.5rem" }}>
                  {(["iframe", "html", "react", "php"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveCodeTab(tab)}
                      style={{
                        padding: "0.6rem 1rem",
                        background: "none",
                        border: "none",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        borderBottom: activeCodeTab === tab ? "2px solid var(--primary)" : "none",
                        color: activeCodeTab === tab ? "var(--primary)" : "var(--text-secondary)",
                        textTransform: "uppercase"
                      }}
                    >
                      {tab === "iframe" ? "WordPress / Iframe" : tab === "html" ? "HTML & JS" : tab}
                    </button>
                  ))}
                </div>

                <div style={{ position: "relative" }}>
                  <button 
                    onClick={copyToClipboard}
                    className="btn btn-secondary animate-fade-in"
                    style={{ position: "absolute", top: "0.5rem", right: "0.5rem", padding: "0.4rem 0.75rem", fontSize: "0.8rem", display: "flex", gap: "0.35rem", alignItems: "center" }}
                  >
                    {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy Code"}
                  </button>
                  
                  <pre style={{
                    backgroundColor: "#1e293b",
                    color: "#f8fafc",
                    padding: "1.5rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.85rem",
                    lineHeight: "1.5",
                    overflowX: "auto",
                    maxHeight: "350px"
                  }}>
                    <code>{getEmbedCode()}</code>
                  </pre>
                </div>

                {/* External link check */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "1.5rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--primary-light)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--primary)",
                  fontSize: "0.85rem",
                  fontWeight: 500
                }}>
                  <ExternalLink size={16} />
                  <span>Public Render Link: <a href={`/f/${selectedForm.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "inherit", fontWeight: "bold" }}>/f/{selectedForm.id}</a></span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details View Overlay */}
      {selectedLead && selectedForm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button 
              onClick={() => setSelectedLead(null)}
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: "1.5rem" }}>Lead Details</h2>
            
            <div style={{ display: "grid", gap: "1.25rem" }}>
              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Submission Timestamp</span>
                <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>
                  {new Date(selectedLead.createdAt).toLocaleString()}
                </div>
              </div>
              
              {[...selectedForm.fields].sort((a, b) => a.order - b.order).map(field => {
                const val = selectedLead.data?.[field.name];
                const displayVal = typeof val === "boolean"
                  ? (val ? "Yes" : "No")
                  : val !== undefined && val !== null
                    ? val.toString()
                    : "-";
                    
                return (
                  <div key={field.id} style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{field.label}</span>
                    <div style={{ fontWeight: 500, whiteSpace: "pre-wrap", color: "var(--text-primary)", marginTop: "0.25rem", fontSize: "1rem" }}>
                      {displayVal}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end", gap: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
              <button onClick={() => handleDeleteLead(selectedLead.id)} className="btn btn-danger" disabled={deleting === selectedLead.id}>
                Delete Entry
              </button>
              <button onClick={() => setSelectedLead(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-card)", padding: "1.5rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "auto" }}>
        Aero Form Builder &bull; Developed by RemotizedIT &bull; &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
