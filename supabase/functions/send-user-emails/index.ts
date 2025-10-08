import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "invite" | "approval" | "rejection" | "suspension" | "admin_notification";
  recipientEmail: string;
  recipientName?: string;
  adminName?: string;
  reason?: string;
  temporaryPassword?: string;
}

const ADMIN_EMAILS = ["khushvardhandembla@gmail.com", "simran.sachdeva.official@gmail.com"];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, adminName, reason, temporaryPassword }: EmailRequest =
      await req.json();

    let subject = "";
    let html = "";

    switch (type) {
      case "invite":
        subject = "Welcome to Sandwich Essay Platform";
        html = `
          <h1>Welcome to Sandwich Essay Platform!</h1>
          <p>Hello ${recipientName || "there"},</p>
          <p>An administrator has created an account for you on our platform.</p>
          <p><strong>Your login credentials:</strong></p>
          <ul>
            <li>Email: ${recipientEmail}</li>
            <li>Temporary Password: ${temporaryPassword}</li>
          </ul>
          <p>Please log in and change your password as soon as possible.</p>
          <p><a href="${Deno.env.get("SUPABASE_URL")?.replace("/v1", "")}/auth">Log in to your account</a></p>
          <p>Best regards,<br>The Sandwich Essay Team</p>
        `;
        break;

      case "approval":
        subject = "Your Account Has Been Approved";
        html = `
          <h1>Account Approved!</h1>
          <p>Hello ${recipientName || "there"},</p>
          <p>Great news! Your account has been approved by ${adminName || "an administrator"}.</p>
          <p>You can now access all features of the Sandwich Essay Platform.</p>
          <p><a href="${Deno.env.get("SUPABASE_URL")?.replace("/v1", "")}/dashboard">Go to Dashboard</a></p>
          <p>Best regards,<br>The Sandwich Essay Team</p>
        `;
        break;

      case "rejection":
        subject = "Account Application Status";
        html = `
          <h1>Account Application Update</h1>
          <p>Hello ${recipientName || "there"},</p>
          <p>We regret to inform you that your account application has not been approved at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          <p>If you believe this is a mistake or have questions, please contact our support team.</p>
          <p>Best regards,<br>The Sandwich Essay Team</p>
        `;
        break;

      case "suspension":
        subject = "Account Suspended";
        html = `
          <h1>Account Suspension Notice</h1>
          <p>Hello ${recipientName || "there"},</p>
          <p>Your account has been suspended by an administrator.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          <p>If you have questions about this action, please contact our support team.</p>
          <p>Best regards,<br>The Sandwich Essay Team</p>
        `;
        break;

      case "admin_notification":
        subject = "New User Signup - Action Required";
        html = `
          <h1>New User Signup</h1>
          <p>A new user has signed up and requires approval:</p>
          <ul>
            <li><strong>Name:</strong> ${recipientName || "Not provided"}</li>
            <li><strong>Email:</strong> ${recipientEmail}</li>
          </ul>
          <p>Please log in to the admin dashboard to review and approve this account.</p>
          <p><a href="${Deno.env.get("SUPABASE_URL")?.replace("/v1", "")}/dashboard">Go to Admin Dashboard</a></p>
        `;

        // Send to all admin emails
        const adminPromises = ADMIN_EMAILS.map((adminEmail) =>
          resend.emails.send({
            from: "Sandwich Essay <onboarding@editor.sandwichglobal.com>",
            to: [adminEmail],
            subject,
            html,
          }),
        );

        await Promise.all(adminPromises);

        return new Response(JSON.stringify({ success: true, message: "Admin notifications sent" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const emailResponse = await resend.emails.send({
      from: "Sandwich Essay <onboarding@editor.sandwichglobal.com>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-user-emails function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
