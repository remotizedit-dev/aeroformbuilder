"use client";

import { useEffect, useState } from "react";
import { getForms, getLeads, deleteLead, Form } from "@/lib/formService";
import { Loader2, Download, Search, Eye, Trash2, X, AlertCircle } from "lucide-react";

export default function AdminLeadsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load Forms
  useEffect(() => {
    async function loadInitialData() {
      try {
        const fetchedForms = await getForms();
        setForms(fetchedForms);
        if (fetchedForms.length > 0) {
          setSelectedFormId(fetchedForms[0].id);
        }
      } catch (err) {
        console.error("Error loading forms:", err);
      } finally {
        setLoadingForms(false);
      }
    }
    loadInitialData();
  }, []);

  // Load Leads when selectedFormId changes
  useEffect(() => {
    if (!selectedFormId) {
      setLeads([]);
      return;
    }

    async function loadLeads() {
      setLoadingLeads(true);
      try {
        const fetchedLeads = await getLeads(selectedFormId);
        setLeads(fetchedLeads);
      } catch (err) {
        console.error("Error loading leads:", err);
      } finally {
        setLoadingLeads(false);
      }
    }
    loadLeads();
  }, [selectedFormId]);

  const selectedForm = forms.find(f => f.id === selectedFormId);

  // Client search filtering
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const searchString = JSON.stringify(lead.data || {}).toLowerCase();
    const dateString = new Date(lead.createdAt).toLocaleDateString().toLowerCase();
    return searchString.includes(searchTerm.toLowerCase()) || dateString.includes(searchTerm.toLowerCase());
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    setDeleting(id);
    try {
      await deleteLead(id);
      setLeads(leads.filter(l => l.id !== id));
      if (selectedLead?.id === id) setSelectedLead(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete lead");
    } finally {
      setDeleting(null);
    }
  };

  const exportCSV = () => {
    if (!selectedForm || filteredLeads.length === 0) return;
    
    // Sort fields by order
    const sortedFields = [...selectedForm.fields].sort((a, b) => a.order - b.order);
    
    // CSV Header row
    const headers = ["Submission Date", "Status", ...sortedFields.map(f => f.label)];
    
    // CSV Data rows
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
    link.setAttribute("download", `${selectedForm.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-leads-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingForms) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ marginBottom: "0.25rem" }}>Leads Observer</h1>
            <p style={{ margin: 0 }}>Inspect and export dynamic lead logs collected across form structures.</p>
          </div>
          {selectedForm && filteredLeads.length > 0 && (
            <button onClick={exportCSV} className="btn btn-primary">
              <Download size={18} /> Export CSV
            </button>
          )}
        </div>

        {forms.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <AlertCircle size={48} color="var(--text-secondary)" style={{ margin: "0 auto 1rem" }} />
            <h3>No Forms Configured</h3>
            <p>Go to Forms Manager to build a form configuration first.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {/* Filter and select settings */}
            <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
              <div style={{ flex: "1", minWidth: "200px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                  Select Form ID
                </label>
                <select 
                  className="form-input" 
                  value={selectedFormId} 
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  style={{ marginBottom: 0 }}
                >
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: "1.5", minWidth: "250px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                  Search Leads
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", top: "50%", left: "1rem", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>
                    <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search inside lead content..." 
                    style={{ paddingLeft: "2.75rem", marginBottom: 0 }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Submissions List Table */}
            {loadingLeads ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                <Loader2 className="animate-spin" size={32} color="var(--primary)" />
              </div>
            ) : !selectedForm ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>Select a form ID to display entries.</div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                No submissions found for &quot;{selectedForm.name}&quot; (ID: {selectedForm.id}).
              </div>
            ) : (
              <div className="table-container" style={{ border: "none" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Submission Date</th>
                      {/* Form field header columns mapping */}
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
                                <div style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                              fontWeight: 600,
                              textTransform: "capitalize"
                            }}>
                              {lead.status || "New"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                              <button 
                                onClick={() => setSelectedLead(lead)}
                                className="btn btn-secondary" 
                                style={{ padding: "0.5rem", border: "none" }}
                                title="View Details"
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                onClick={() => handleDelete(lead.id)}
                                className="btn btn-secondary" 
                                style={{ padding: "0.5rem", border: "none", color: "var(--danger)" }}
                                title="Delete Lead"
                                disabled={deleting === lead.id}
                              >
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
      </div>

      {/* Details Modal */}
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
              <button onClick={() => handleDelete(selectedLead.id)} className="btn btn-danger" disabled={deleting === selectedLead.id}>
                Delete Entry
              </button>
              <button onClick={() => setSelectedLead(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
