"use client";

import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { FormField } from "@/lib/formService";

interface EmbeddedFormClientProps {
  form: {
    id: string;
    name: string;
    fields: FormField[];
  };
}

export default function EmbeddedFormClient({ form }: EmbeddedFormClientProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    form.fields.forEach(f => {
      if (f.type === "checkbox") {
        initial[f.name] = false;
      } else {
        initial[f.name] = "";
      }
    });
    return initial;
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === "checkbox" ? target.checked : target.value;
    setFormData({
      ...formData,
      [target.name]: value,
    });
    
    // Clear validation error when editing the field
    if (fieldErrors[target.name]) {
      setFieldErrors({
        ...fieldErrors,
        [target.name]: "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setFieldErrors({});

    try {
      const response = await fetch(`/api/submit/${form.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Reset form
        const reset: Record<string, any> = {};
        form.fields.forEach(f => {
          if (f.type === "checkbox") {
            reset[f.name] = false;
          } else {
            reset[f.name] = "";
          }
        });
        setFormData(reset);
      } else {
        if (result.fields) {
          setFieldErrors(result.fields);
          setError("Please correct the highlighted fields.");
        } else {
          setError(result.error || "Failed to submit. Please try again.");
        }
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const sortedFields = [...form.fields].sort((a, b) => a.order - b.order);

  if (success) {
    return (
      <div className="glass-card" style={{
        textAlign: "center",
        padding: "3rem 2rem",
        borderRadius: "1rem",
        width: "100%",
        maxWidth: "500px",
        boxShadow: "var(--shadow-lg)"
      }}>
        <CheckCircle color="var(--success)" size={52} style={{ margin: "0 auto 1.25rem" }} />
        <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Thank You!</h3>
        <p style={{ color: "var(--text-secondary)" }}>Your submission for <strong>{form.name}</strong> was sent successfully.</p>
        <button 
          className="btn btn-primary" 
          style={{ marginTop: "1.5rem" }}
          onClick={() => setSuccess(false)}
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card" style={{
      padding: "2rem",
      borderRadius: "1rem",
      width: "100%",
      maxWidth: "500px",
      boxShadow: "var(--shadow-lg)"
    }}>
      <h3 style={{ marginBottom: "0.5rem", fontSize: "1.5rem", color: "var(--primary)" }}>
        {form.name}
      </h3>
      <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
        Fill out this form. Mandatory fields are marked with *.
      </p>

      {error && (
        <div style={{
          backgroundColor: "var(--danger)",
          color: "white",
          padding: "0.75rem",
          borderRadius: "var(--radius-md)",
          marginBottom: "1.5rem",
          fontSize: "0.875rem",
          fontWeight: 500
        }}>
          {error}
        </div>
      )}

      {sortedFields.map(field => {
        const errorMsg = fieldErrors[field.name];

        return (
          <div key={field.id} className="form-group" style={{ marginBottom: "1.25rem" }}>
            {field.type !== "checkbox" && (
              <label className="form-label" htmlFor={field.id}>
                {field.label} {field.required && <span style={{ color: "var(--danger)" }}>*</span>}
              </label>
            )}

            {field.type === "textarea" ? (
              <textarea
                id={field.id}
                name={field.name}
                required={field.required}
                className="form-input"
                style={{ resize: "vertical", minHeight: "100px", borderColor: errorMsg ? "var(--danger)" : undefined }}
                value={formData[field.name] || ""}
                onChange={handleChange}
              />
            ) : field.type === "select" ? (
              <select
                id={field.id}
                name={field.name}
                required={field.required}
                className="form-input"
                style={{ borderColor: errorMsg ? "var(--danger)" : undefined }}
                value={formData[field.name] || ""}
                onChange={handleChange}
              >
                <option value="">Select option...</option>
                {field.options?.map((opt, idx) => (
                  <option key={idx} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0.5rem 0" }}>
                <input
                  type="checkbox"
                  id={field.id}
                  name={field.name}
                  checked={!!formData[field.name]}
                  onChange={handleChange}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "var(--primary)"
                  }}
                />
                <label 
                  htmlFor={field.id} 
                  style={{ 
                    fontSize: "0.95rem", 
                    fontWeight: 500, 
                    cursor: "pointer", 
                    color: "var(--text-primary)" 
                  }}
                >
                  {field.label} {field.required && <span style={{ color: "var(--danger)" }}>*</span>}
                </label>
              </div>
            ) : (
              <input
                type={field.type}
                id={field.id}
                name={field.name}
                required={field.required}
                className="form-input"
                style={{ borderColor: errorMsg ? "var(--danger)" : undefined }}
                value={formData[field.name] || ""}
                onChange={handleChange}
              />
            )}

            {errorMsg && (
              <span style={{ color: "var(--danger)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                {errorMsg}
              </span>
            )}
          </div>
        );
      })}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: "100%", marginTop: "1rem" }}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 style={{ animation: "spin 1s linear infinite" }} size={20} />
            Submitting...
          </>
        ) : (
          "Submit Response"
        )}
      </button>
    </form>
  );
}
