import { getForm } from "@/lib/formService";
import EmbeddedFormClient from "./EmbeddedFormClient";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function PublicFormPage({ params }: PageProps) {
  const { formId } = await params;
  const form = await getForm(formId);

  if (!form) {
    notFound();
  }

  // Pass only database structure safe properties to client
  const safeForm = {
    id: form.id,
    name: form.name,
    fields: form.fields,
    themeColor: form.themeColor || "#026aa2",
    bgColor: form.bgColor || "#ffffff",
    textColor: form.textColor || "#101828",
    inputBgColor: form.inputBgColor || "#ffffff",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      padding: "1rem",
    }}>
      <EmbeddedFormClient form={safeForm} />
    </div>
  );
}
