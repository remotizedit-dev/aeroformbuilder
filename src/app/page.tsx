import { redirect } from "next/navigation";
import { getClientSession } from "@/app/actions/clientAuth";
import { getForm, getForms, Form } from "@/lib/formService";
import ClientDashboardClient from "./ClientDashboardClient";

export const dynamic = "force-dynamic";

export default async function ClientHomePage() {
  const session = await getClientSession();

  if (!session) {
    redirect("/login");
  }

  let forms: Form[] = [];
  
  if (session.isSuperAdmin) {
    // Super Admin loads all forms
    forms = await getForms();
  } else {
    // Regular client loads their specific form
    const form = await getForm(session.formId);
    if (form) {
      forms = [form];
    }
  }

  return (
    <ClientDashboardClient 
      session={session} 
      initialForms={forms} 
    />
  );
}
