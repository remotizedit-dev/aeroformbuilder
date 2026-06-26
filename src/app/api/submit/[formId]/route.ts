import { NextResponse, NextRequest } from "next/server";
import { getForm, submitLead } from "@/lib/formService";
import { sendLeadEmail } from "@/app/actions/sendEmail";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const form = await getForm(formId);

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate fields according to the form builder's configuration
    const errors: Record<string, string> = {};
    const sanitizedData: Record<string, any> = {};

    for (const field of form.fields) {
      // Inputs could be submitted by field name (e.g. "fullname" / "fullName" / etc.)
      const value = body[field.name];
      if (field.required && (value === undefined || value === null || value === "" || value === false)) {
        errors[field.name] = `${field.label} is required`;
      } else {
        // If checkbox, normalize value to yes/no or boolean for readability
        if (field.type === "checkbox") {
          sanitizedData[field.label] = value ? "Yes" : "No";
        } else {
          sanitizedData[field.label] = value !== undefined ? value : "";
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", fields: errors },
        { status: 400, headers: corsHeaders }
      );
    }

    // Store raw data in leads database
    await submitLead(formId, body);

    // Send SMTP notification using configured email settings
    if (form.emailSettings && form.emailSettings.senderEmail && form.emailSettings.senderAppPassword) {
      try {
        await sendLeadEmail(form.emailSettings, form.name, sanitizedData);
      } catch (emailErr) {
        console.error("Email notification failed:", emailErr);
      }
    }

    return NextResponse.json(
      { success: true, message: "Submission saved successfully." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Error processing lead submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
