"use server";

import { cookies } from "next/headers";
import crypto from "crypto";
import { getForm, saveForm, getLeads, deleteLead, FormField } from "@/lib/formService";

const ENCRYPTION_KEY = process.env.SESSION_SECRET || "aero-form-builder-secret-32-chars";
const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string): string | null {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return null;
  }
}

export interface ClientSession {
  formId: string;
  username: string;
  isSuperAdmin: boolean;
}

export async function loginClient(formIdInput: string, usernameInput: string, passwordInput: string) {
  const formId = formIdInput.trim().toLowerCase();
  const username = usernameInput.trim();
  const password = passwordInput;

  // Retrieve Super Admin configurations
  const superAdminUser = process.env.SUPER_ADMIN_USERNAME || "superadmin";
  const superAdminPass = process.env.SUPER_ADMIN_PASSWORD || "superadmin123";

  // Check Super Admin Credentials
  if (username === superAdminUser && password === superAdminPass) {
    const sessionData: ClientSession = {
      formId: formId || "all",
      username: superAdminUser,
      isSuperAdmin: true
    };

    const cookieStore = await cookies();
    cookieStore.set("client_session", encrypt(JSON.stringify(sessionData)), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return { success: true, isSuperAdmin: true };
  }

  // Regular Form Client Credentials Check
  if (!formId) {
    return { success: false, error: "Form ID is required for regular users" };
  }

  const form = await getForm(formId);
  if (!form) {
    return { success: false, error: "Form ID not found" };
  }

  if (form.clientUsername === username && form.clientPassword === password) {
    const sessionData: ClientSession = {
      formId: form.id,
      username: form.clientUsername,
      isSuperAdmin: false
    };

    const cookieStore = await cookies();
    cookieStore.set("client_session", encrypt(JSON.stringify(sessionData)), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return { success: true, isSuperAdmin: false };
  }

  return { success: false, error: "Invalid username or password" };
}

export async function getClientSession(): Promise<ClientSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("client_session");
    if (!sessionCookie) return null;

    const decrypted = decrypt(sessionCookie.value);
    if (!decrypted) return null;

    return JSON.parse(decrypted) as ClientSession;
  } catch {
    return null;
  }
}

export async function logoutClient() {
  const cookieStore = await cookies();
  cookieStore.delete("client_session");
  return { success: true };
}

export async function updateReceiverEmails(formId: string, receiverEmails: string) {
  const session = await getClientSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  // Authorization Check
  if (session.formId !== formId && !session.isSuperAdmin) {
    return { success: false, error: "Unauthorized access" };
  }

  try {
    const form = await getForm(formId);
    if (!form) return { success: false, error: "Form not found" };

    form.emailSettings.receiverEmails = receiverEmails;
    await saveForm(form);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating recipients:", error);
    return { success: false, error: error.message };
  }
}

export async function getClientLeads(formId: string) {
  const session = await getClientSession();
  if (!session) {
    throw new Error("Unauthenticated session");
  }

  // Authorization Check
  if (session.formId !== formId && !session.isSuperAdmin) {
    throw new Error("Unauthorized leads access");
  }

  return await getLeads(formId);
}

export async function deleteClientLead(formId: string, leadId: string) {
  const session = await getClientSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  // Authorization Check
  if (session.formId !== formId && !session.isSuperAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await deleteLead(leadId);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting client lead:", error);
    return { success: false, error: error.message };
  }
}

export async function updateClientFormFields(formId: string, name: string, fields: FormField[]) {
  const session = await getClientSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  // Authorization Check
  if (session.formId !== formId && !session.isSuperAdmin) {
    return { success: false, error: "Unauthorized access" };
  }

  try {
    const form = await getForm(formId);
    if (!form) return { success: false, error: "Form not found" };

    form.name = name;
    form.fields = fields;
    await saveForm(form);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating client form fields:", error);
    return { success: false, error: error.message };
  }
}
