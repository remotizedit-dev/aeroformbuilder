"use client";

import { useEffect, useState } from "react";
import { getForms, saveForm, deleteForm, formExists, Form, FormField, FormFieldType } from "@/lib/formService";
import { Plus, Edit, Trash2, Code, Copy, ArrowUp, ArrowDown, X, Loader2, Check, ExternalLink, Shield } from "lucide-react";

export default function AdminFormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // true if editing existing form, false if creating new
  const [saving, setSaving] = useState(false);
  const [editingForm, setEditingForm] = useState<Partial<Form>>({
    id: "",
    name: "",
    clientUsername: "",
    clientPassword: "",
    fields: [],
    emailSettings: {
      senderEmail: "",
      senderAppPassword: "",
      receiverEmails: ""
    },
    themeColor: "#026aa2",
    bgColor: "#ffffff",
    textColor: "#101828",
    inputBgColor: "#ffffff"
  });

  // Embed Modal State
  const [activeEmbedForm, setActiveEmbedForm] = useState<Form | null>(null);
  const [activeTab, setActiveTab] = useState<"iframe" | "html" | "react" | "php">("iframe");
  const [copied, setCopied] = useState(false);

  // Load Forms
  useEffect(() => {
    async function fetchForms() {
      try {
        const fetchedForms = await getForms();
        setForms(fetchedForms);
      } catch (err) {
        console.error("Error loading forms:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchForms();
  }, []);

  const handleCreateNew = () => {
    setEditingForm({
      id: "",
      name: "",
      clientUsername: "",
      clientPassword: "",
      fields: [
        { id: "f1", name: "fullName", label: "Full Name", type: "text", required: true, order: 1 },
        { id: "f2", name: "email", label: "Email Address", type: "email", required: true, order: 2 }
      ],
      emailSettings: {
        senderEmail: "",
        senderAppPassword: "",
        receiverEmails: ""
      },
      themeColor: "#026aa2",
      bgColor: "#ffffff",
      textColor: "#101828",
      inputBgColor: "#ffffff"
    });
    setIsEditMode(false);
    setIsEditing(true);
  };

  const handleEdit = (form: Form) => {
    setEditingForm(JSON.parse(JSON.stringify(form))); // deep copy
    setIsEditMode(true);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this form and all its leads?")) return;
    try {
      await deleteForm(id);
      setForms(forms.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete form.");
    }
  };

  const handleAddField = () => {
    const fields = editingForm.fields ? [...editingForm.fields] : [];
    const nextId = `f_${Date.now()}`;
    const nextOrder = fields.length > 0 ? Math.max(...fields.map(f => f.order)) + 1 : 1;
    fields.push({
      id: nextId,
      name: `field_${nextId}`,
      label: "New Field",
      type: "text",
      required: false,
      order: nextOrder
    });
    setEditingForm({ ...editingForm, fields });
  };

  const handleRemoveField = (fieldId: string) => {
    const fields = editingForm.fields ? editingForm.fields.filter(f => f.id !== fieldId) : [];
    setEditingForm({ ...editingForm, fields });
  };

  const handleFieldChange = (fieldId: string, updates: Partial<FormField>) => {
    const fields = editingForm.fields ? editingForm.fields.map(f => {
      if (f.id === fieldId) {
        const updated = { ...f, ...updates };
        if (updates.label !== undefined) {
          updated.name = updates.label
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .trim();
          if (!updated.name) updated.name = `field_${fieldId}`;
        }
        return updated;
      }
      return f;
    }) : [];
    setEditingForm({ ...editingForm, fields });
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const fields = editingForm.fields ? [...editingForm.fields] : [];
    if (direction === "up" && index > 0) {
      const temp = fields[index];
      fields[index] = fields[index - 1];
      fields[index - 1] = temp;
    } else if (direction === "down" && index < fields.length - 1) {
      const temp = fields[index];
      fields[index] = fields[index + 1];
      fields[index + 1] = temp;
    }
    const reordered = fields.map((f, i) => ({ ...f, order: i + 1 }));
    setEditingForm({ ...editingForm, fields: reordered });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForm.id) return alert("Form ID (Slug) is required");
    if (!editingForm.name) return alert("Form Name is required");
    if (!editingForm.clientUsername || !editingForm.clientPassword) {
      return alert("Client Username and Password are required");
    }
    if (!editingForm.fields || editingForm.fields.length === 0) {
      return alert("At least one field is required");
    }

    const sanitizedId = editingForm.id.toLowerCase().replace(/[^a-z0-9-_]/g, "").trim();
    if (!sanitizedId) return alert("Form ID must contain valid alphanumeric characters, hyphens or underscores.");

    setSaving(true);
    try {
      // Check for duplicates when creating a new form
      if (!isEditMode) {
        const exists = await formExists(sanitizedId);
        if (exists) {
          alert(`Form ID "${sanitizedId}" is already in use. Please select a different identifier.`);
          setSaving(false);
          return;
        }
      }

      const formToSave = { ...editingForm, id: sanitizedId } as Form;
      await saveForm(formToSave);

      if (isEditMode) {
        setForms(forms.map(f => f.id === editingForm.id ? formToSave : f));
      } else {
        setForms([formToSave, ...forms]);
      }
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save form settings.");
    } finally {
      setSaving(false);
    }
  };

  const getEmbedCode = () => {
    if (!activeEmbedForm) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
    const iframeUrl = `${origin}/f/${activeEmbedForm.id}`;
    const apiUrl = `${origin}/api/submit/${activeEmbedForm.id}`;

    switch (activeTab) {
      case "iframe":
        return `<iframe src="${iframeUrl}" width="100%" height="550" frameborder="0" style="border:none; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.05); min-width:320px;"></iframe>`;
      case "html":
        return `<form id="embed-form-${activeEmbedForm.id}">
  <!-- Fields -->
${activeEmbedForm.fields.map(f => `  <div style="margin-bottom: 12px;">
    <label style="display:block; font-weight:bold; margin-bottom:4px; font-family:sans-serif;">${f.label}${f.required ? ' *' : ''}</label>
    ${f.type === 'textarea' 
      ? `<textarea name="${f.name}" ${f.required ? 'required' : ''} style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:sans-serif;"></textarea>` 
      : f.type === 'select' 
        ? `<select name="${f.name}" ${f.required ? 'required' : ''} style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:sans-serif;">\n      <option value="">Select option...</option>\n${f.options?.map(o => `      <option value="${o}">${o}</option>`).join('\n') || ''}\n    </select>`
        : f.type === 'checkbox'
          ? `<input type="checkbox" name="${f.name}" ${f.required ? 'required' : ''} style="margin-right:6px;" /> ${f.label}`
          : `<input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:sans-serif;" />`
    }
  </div>`).join('\n')}
  
  <button type="submit" style="padding:10px 20px; background-color:#026aa2; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-family:sans-serif;">Submit</button>
</form>

<script>
document.getElementById('embed-form-${activeEmbedForm.id}').addEventListener('submit', async function(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {};
  
  formData.forEach((value, key) => {
    const element = e.target.querySelector(\`[name="\${key}"]\`);
    if (element && element.type === 'checkbox') {
      data[key] = element.checked;
    } else {
      data[key] = value;
    }
  });

  try {
    const response = await fetch('${apiUrl}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const res = await response.json();
    if (response.ok) {
      alert('Form submitted successfully!');
      e.target.reset();
    } else {
      alert('Error: ' + (res.error || 'Submission failed'));
    }
  } catch (err) {
    console.error(err);
    alert('An unexpected error occurred.');
  }
});
</script>`;

      case "react":
        return `import React, { useState } from 'react';

export default function EmbeddedForm() {
  const [formData, setFormData] = useState({
${activeEmbedForm.fields.map(f => `    ${f.name}: ${f.type === 'checkbox' ? 'false' : "''"}`).join(',\n')}
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('${apiUrl}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        alert('Submitted successfully!');
        setFormData({
${activeEmbedForm.fields.map(f => `          ${f.name}: ${f.type === 'checkbox' ? 'false' : "''"}`).join(',\n')}
        });
      } else {
        alert('Submission failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Network error submitting form.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', border: '1px solid #eaecf0', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h3 style={{ marginTop: 0 }}>${activeEmbedForm.name}</h3>
${activeEmbedForm.fields.map(f => `
      <div style={{ marginBottom: '15px' }}>
        ${f.type !== 'checkbox' ? `<label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>${f.label}${f.required ? ' *' : ''}</label>` : ''}
        ${f.type === 'textarea'
          ? `<textarea name="${f.name}" required={${f.required}} value={formData.${f.name}} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />`
          : f.type === 'select'
            ? `<select name="${f.name}" required={${f.required}} value={formData.${f.name}} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value="">Select option...</option>
${f.options?.map(o => `            <option value="${o}">${o}</option>`).join('\n') || ''}
          </select>`
            : f.type === 'checkbox'
              ? `<label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <input type="checkbox" name="${f.name}" checked={formData.${f.name}} onChange={handleChange} />
            ${f.label}${f.required ? ' *' : ''}
          </label>`
              : `<input type="${f.type}" name="${f.name}" required={${f.required}} value={formData.${f.name}} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />`
        }
      </div>`).join('')}
      <button type="submit" disabled={submitting} style={{ padding: '10px 20px', backgroundColor: '#026aa2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}`.trim();

      case "php":
        return `<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $postData = json_encode($_POST);

    $ch = curl_init('${apiUrl}');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($postData)
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $resDecoded = json_decode($response, true);
    if ($httpCode === 200) {
        $successMsg = "Submitted successfully!";
    } else {
        $errorMsg = isset($resDecoded['error']) ? $resDecoded['error'] : "Submission failed";
    }
}
?>

<!-- HTML Form -->
<form method="POST">
${activeEmbedForm.fields.map(f => `  <div style="margin-bottom: 12px; font-family: sans-serif;">
    <label style="display:block; font-weight:bold; margin-bottom:4px;">${f.label}${f.required ? ' *' : ''}</label>
    ${f.type === 'textarea' 
      ? `<textarea name="${f.name}" ${f.required ? 'required' : ''} style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:sans-serif;"></textarea>` 
      : f.type === 'select' 
        ? `<select name="${f.name}" ${f.required ? 'required' : ''} style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:sans-serif;">
      <option value="">Select option...</option>
${f.options?.map(o => `      <option value="${o}">${o}</option>`).join('\n') || ''}
    </select>`
        : f.type === 'checkbox'
          ? `<input type="checkbox" name="${f.name}" value="1" style="margin-right:6px;" /> ${f.label}`
          : `<input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-family:sans-serif;" />`
    }
  </div>`).join('\n')}
  <button type="submit" style="padding:10px 20px; background-color:#026aa2; color:#fff; border:none; border-radius:4px; font-weight:bold; font-family:sans-serif;">Submit</button>
</form>`;
    }
  };

  const copyToClipboard = () => {
    const code = getEmbedCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ marginBottom: "0.25rem" }}>Forms Builder</h1>
            <p style={{ margin: 0 }}>Create dynamic layouts and customize tenant client credentials.</p>
          </div>
          <button onClick={handleCreateNew} className="btn btn-primary">
            <Plus size={18} /> Create Form
          </button>
        </div>

        {forms.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <h3 style={{ marginBottom: "0.5rem" }}>No Forms Created</h3>
            <p style={{ marginBottom: "1.5rem" }}>Create your first dynamic form to start collecting leads externally.</p>
            <button onClick={handleCreateNew} className="btn btn-primary">
              <Plus size={18} /> Create Form
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Form ID</th>
                    <th>Form Name</th>
                    <th>Client Username</th>
                    <th>Fields</th>
                    <th>Created At</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map(form => (
                    <tr key={form.id}>
                      <td style={{ fontWeight: 700, color: "var(--primary)" }}>{form.id}</td>
                      <td style={{ fontWeight: 600 }}>{form.name}</td>
                      <td style={{ fontSize: "0.9rem" }}><code>{form.clientUsername}</code></td>
                      <td>
                        <span style={{ padding: "0.25rem 0.5rem", backgroundColor: "var(--primary-light)", color: "var(--primary)", borderRadius: "var(--radius-md)", fontSize: "0.8rem", fontWeight: 600 }}>
                          {form.fields.length} fields
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {form.createdAt ? new Date(form.createdAt).toLocaleDateString() : "N/A"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button onClick={() => setActiveEmbedForm(form)} className="btn btn-secondary" style={{ padding: "0.5rem", border: "none" }} title="Embed Code">
                            <Code size={18} />
                          </button>
                          <button onClick={() => handleEdit(form)} className="btn btn-secondary" style={{ padding: "0.5rem", border: "none" }} title="Edit Config">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDelete(form.id)} className="btn btn-secondary" style={{ padding: "0.5rem", border: "none", color: "var(--danger)" }} title="Delete Form">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isEditing && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button 
              onClick={() => setIsEditing(false)}
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: "1.5rem" }}>{isEditMode ? "Edit Form Template" : "Create Dynamic Form"}</h2>

            <form onSubmit={handleSaveForm}>
              {/* Form Metadata */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Form ID (Slug/Unique Key)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingForm.id || ""} 
                    onChange={(e) => setEditingForm({ ...editingForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "") })} 
                    placeholder="e.g. contact-form"
                    disabled={isEditMode} // Cannot edit Form ID once created
                    required 
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginTop: "0.25rem" }}>
                    Lowercase letters, numbers, hyphens, and underscores only.
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Form Name (Internal Title)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingForm.name || ""} 
                    onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })} 
                    placeholder="e.g. Website Contact Form"
                    required 
                  />
                </div>
              </div>

              {/* Form Style Customizer */}
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", marginBottom: "1.5rem", backgroundColor: "var(--bg-main)" }}>
                <h4 style={{ margin: "0 0 1.25rem 0", color: "var(--primary)", fontSize: "1rem" }}>Form Style Theme Customizer</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                  
                  {/* Theme / Button Color */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Button & Accent Color</label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input 
                        type="color" 
                        className="form-input" 
                        style={{ width: "50px", height: "42px", padding: "0.25rem", cursor: "pointer", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                        value={editingForm.themeColor || "#026aa2"} 
                        onChange={(e) => setEditingForm({ ...editingForm, themeColor: e.target.value })} 
                      />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ flex: 1, fontFamily: "monospace", textTransform: "uppercase", fontSize: "0.9rem" }}
                        value={editingForm.themeColor || "#026aa2"} 
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val && !val.startsWith("#")) val = "#" + val;
                          if (val.length <= 7) {
                            setEditingForm({ ...editingForm, themeColor: val });
                          }
                        }} 
                        placeholder="#026AA2"
                      />
                    </div>
                  </div>

                  {/* Card Background Color */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Card Background Color</label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input 
                        type="color" 
                        className="form-input" 
                        style={{ width: "50px", height: "42px", padding: "0.25rem", cursor: "pointer", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                        value={editingForm.bgColor || "#ffffff"} 
                        onChange={(e) => setEditingForm({ ...editingForm, bgColor: e.target.value })} 
                      />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ flex: 1, fontFamily: "monospace", textTransform: "uppercase", fontSize: "0.9rem" }}
                        value={editingForm.bgColor || "#ffffff"} 
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val && !val.startsWith("#")) val = "#" + val;
                          if (val.length <= 7) {
                            setEditingForm({ ...editingForm, bgColor: val });
                          }
                        }} 
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                  {/* Text / Label Color */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Text & Labels Color</label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input 
                        type="color" 
                        className="form-input" 
                        style={{ width: "50px", height: "42px", padding: "0.25rem", cursor: "pointer", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                        value={editingForm.textColor || "#101828"} 
                        onChange={(e) => setEditingForm({ ...editingForm, textColor: e.target.value })} 
                      />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ flex: 1, fontFamily: "monospace", textTransform: "uppercase", fontSize: "0.9rem" }}
                        value={editingForm.textColor || "#101828"} 
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val && !val.startsWith("#")) val = "#" + val;
                          if (val.length <= 7) {
                            setEditingForm({ ...editingForm, textColor: val });
                          }
                        }} 
                        placeholder="#101828"
                      />
                    </div>
                  </div>

                  {/* Input Field Color */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Input Fields Background</label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input 
                        type="color" 
                        className="form-input" 
                        style={{ width: "50px", height: "42px", padding: "0.25rem", cursor: "pointer", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                        value={editingForm.inputBgColor || "#ffffff"} 
                        onChange={(e) => setEditingForm({ ...editingForm, inputBgColor: e.target.value })} 
                      />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ flex: 1, fontFamily: "monospace", textTransform: "uppercase", fontSize: "0.9rem" }}
                        value={editingForm.inputBgColor || "#ffffff"} 
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val && !val.startsWith("#")) val = "#" + val;
                          if (val.length <= 7) {
                            setEditingForm({ ...editingForm, inputBgColor: val });
                          }
                        }} 
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Client Auth Credentials Setup */}
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", marginBottom: "1.5rem", backgroundColor: "var(--bg-main)" }}>
                <h4 style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  <Shield size={18} /> Client Viewing Credentials (domain.com)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Client Username</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={editingForm.clientUsername || ""}
                      onChange={(e) => setEditingForm({ ...editingForm, clientUsername: e.target.value.trim() })}
                      placeholder="client_username"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Client Password (Resettable)</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={editingForm.clientPassword || ""}
                      onChange={(e) => setEditingForm({ ...editingForm, clientPassword: e.target.value })}
                      placeholder="client_password_123"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email SMTP Configurations */}
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", marginBottom: "1.5rem", backgroundColor: "var(--bg-main)" }}>
                <h4 style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  SMTP Gmail Configurations
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Sender Gmail Account</label>
                    <input 
                      type="email" 
                      className="form-input"
                      value={editingForm.emailSettings?.senderEmail || ""}
                      onChange={(e) => setEditingForm({
                        ...editingForm,
                        emailSettings: { ...editingForm.emailSettings!, senderEmail: e.target.value }
                      })}
                      placeholder="account@gmail.com"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Gmail App Password</label>
                    <input 
                      type="password" 
                      className="form-input"
                      value={editingForm.emailSettings?.senderAppPassword || ""}
                      onChange={(e) => setEditingForm({
                        ...editingForm,
                        emailSettings: { ...editingForm.emailSettings!, senderAppPassword: e.target.value }
                      })}
                      placeholder="xxxx xxxx xxxx xxxx"
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: "1rem", marginBottom: 0 }}>
                  <label className="form-label">Recipient Email Addresses (Comma Separated)</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={editingForm.emailSettings?.receiverEmails || ""}
                    onChange={(e) => setEditingForm({
                      ...editingForm,
                      emailSettings: { ...editingForm.emailSettings!, receiverEmails: e.target.value }
                    })}
                    placeholder="recipient1@example.com, recipient2@example.com"
                  />
                </div>
              </div>

              {/* Form Input Fields Editor */}
              <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h4 style={{ margin: 0 }}>Form Fields Layout</h4>
                  <button type="button" onClick={handleAddField} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                    <Plus size={16} /> Add Field
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {editingForm.fields?.map((field, index) => (
                    <div key={field.id} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end", padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-card)" }}>
                      
                      <div style={{ flex: "2", minWidth: "150px" }}>
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>Field Label</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={field.label} 
                          onChange={(e) => handleFieldChange(field.id, { label: e.target.value })}
                          required
                        />
                      </div>

                      <div style={{ flex: "1.5", minWidth: "120px" }}>
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>Type</label>
                        <select 
                          className="form-input" 
                          value={field.type} 
                          onChange={(e) => handleFieldChange(field.id, { type: e.target.value as FormFieldType })}
                        >
                          <option value="text">Text Input</option>
                          <option value="email">Email Address</option>
                          <option value="tel">Phone Number</option>
                          <option value="number">Number</option>
                          <option value="textarea">Text Area</option>
                          <option value="select">Dropdown Options</option>
                          <option value="date">Date picker</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>

                      <div style={{ flex: "0.5", minWidth: "60px", alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>Req.</label>
                        <input 
                          type="checkbox" 
                          checked={field.required} 
                          onChange={(e) => handleFieldChange(field.id, { required: e.target.checked })}
                          style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                        />
                      </div>

                      {field.type === "select" && (
                        <div style={{ flex: "100%", width: "100%", marginTop: "0.5rem" }}>
                          <label className="form-label" style={{ fontSize: "0.8rem" }}>Dropdown Options (Comma separated list)</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={field.options?.join(", ") || ""} 
                            onChange={(e) => handleFieldChange(field.id, { options: e.target.value.split(",").map(o => o.trim()).filter(Boolean) })}
                            placeholder="Option 1, Option 2, Option 3"
                            required
                          />
                        </div>
                      )}

                      {/* Sorting controls */}
                      <div style={{ flex: "100%", display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                        <button type="button" onClick={() => moveField(index, "up")} disabled={index === 0} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem" }}>
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" onClick={() => moveField(index, "down")} disabled={index === editingForm.fields!.length - 1} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem" }}>
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" onClick={() => handleRemoveField(field.id)} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", color: "var(--danger)" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><Loader2 className="animate-spin" size={16}/> Saving...</> : "Save Form"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {activeEmbedForm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button 
              onClick={() => setActiveEmbedForm(null)}
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: "0.5rem" }}>Integration Guides</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Embed form &quot;<strong>{activeEmbedForm.name}</strong>&quot; (ID: <code>{activeEmbedForm.id}</code>) into any external website.</p>
            
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: "1.5rem" }}>
              {(["iframe", "html", "react", "php"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "0.75rem 1.25rem",
                    border: "none",
                    background: "none",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    borderBottom: activeTab === tab ? "2px solid var(--primary)" : "none",
                    color: activeTab === tab ? "var(--primary)" : "var(--text-secondary)",
                    textTransform: "uppercase"
                  }}
                >
                  {tab === "iframe" ? "WordPress / Iframe" : tab === "html" ? "HTML & JS" : tab}
                </button>
              ))}
            </div>

            {/* Code Block Container */}
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

            {/* Public URL hint */}
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
              <span>Public Form URL: <a href={`/f/${activeEmbedForm.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "inherit", fontWeight: "bold" }}>/f/{activeEmbedForm.id}</a></span>
            </div>

            <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setActiveEmbedForm(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
