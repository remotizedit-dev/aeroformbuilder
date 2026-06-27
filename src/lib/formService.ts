import { db } from "./firebase";
import { collection, getDocs, addDoc, doc, setDoc, getDoc, query, orderBy, deleteDoc, where } from "firebase/firestore";

export type FormFieldType = "text" | "email" | "tel" | "number" | "textarea" | "select" | "date" | "checkbox";

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[]; // for select type
  order: number;
}

export interface EmailSettings {
  senderEmail: string;
  senderAppPassword: string;
  receiverEmails: string;
}

export interface Form {
  id: string; // The custom Form ID slug (e.g. "contact-form")
  name: string;
  clientUsername: string;
  clientPassword: string;
  fields: FormField[];
  emailSettings: EmailSettings;
  themeColor?: string;
  bgColor?: string;
  textColor?: string;
  inputBgColor?: string;
  createdAt: string;
}

export async function getForms(): Promise<Form[]> {
  try {
    const q = query(collection(db, "forms"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Form[];
  } catch (error) {
    console.error("Error fetching forms:", error);
    return [];
  }
}

export async function getForm(id: string): Promise<Form | null> {
  try {
    const sanitizedId = id.trim().toLowerCase();
    const docRef = doc(db, "forms", sanitizedId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Form;
    }
    return null;
  } catch (error) {
    console.error("Error fetching form:", error);
    return null;
  }
}

export async function formExists(id: string): Promise<boolean> {
  try {
    const sanitizedId = id.trim().toLowerCase();
    const docRef = doc(db, "forms", sanitizedId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch {
    return false;
  }
}

export async function saveForm(form: Form): Promise<string> {
  const sanitizedId = form.id.trim().toLowerCase();
  const docRef = doc(db, "forms", sanitizedId);
  const data = {
    name: form.name,
    clientUsername: form.clientUsername,
    clientPassword: form.clientPassword,
    fields: form.fields,
    emailSettings: form.emailSettings,
    themeColor: form.themeColor || "#026aa2",
    bgColor: form.bgColor || "#ffffff",
    textColor: form.textColor || "#101828",
    inputBgColor: form.inputBgColor || "#ffffff",
    createdAt: form.createdAt || new Date().toISOString()
  };
  await setDoc(docRef, data, { merge: true });
  return sanitizedId;
}

export async function deleteForm(id: string) {
  const sanitizedId = id.trim().toLowerCase();
  const docRef = doc(db, "forms", sanitizedId);
  await deleteDoc(docRef);
  
  // Delete all leads associated with this form
  try {
    const q = query(collection(db, "leads"), where("formId", "==", sanitizedId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error deleting leads associated with form:", error);
  }
}

export async function submitLead(formId: string, data: Record<string, any>) {
  const sanitizedId = formId.trim().toLowerCase();
  const leadsRef = collection(db, "leads");
  await addDoc(leadsRef, {
    formId: sanitizedId,
    data,
    createdAt: new Date().toISOString(),
    status: "new"
  });
}

export async function getLeads(formId?: string) {
  try {
    if (formId) {
      const sanitizedId = formId.trim().toLowerCase();
      try {
        const q = query(
          collection(db, "leads"),
          where("formId", "==", sanitizedId),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (indexError) {
        // Fallback to client-side sort if Firestore composite index is missing
        console.warn("Index missing, falling back to client-side sort:", indexError);
        const qSimple = query(collection(db, "leads"), where("formId", "==", sanitizedId));
        const snapshot = await getDocs(qSimple);
        const mapped = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return mapped.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } else {
      const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
}

export async function deleteLead(id: string) {
  const docRef = doc(db, "leads", id);
  await deleteDoc(docRef);
}
