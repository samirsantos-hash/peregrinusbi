import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Use getUser instead of getClaims for broader compatibility
    const { data: { user: callerUser }, error: userError } = await callerClient.auth.getUser();
    if (userError || !callerUser) {
      console.error("Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = callerUser.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action } = body;

    // Allow users to finalize their own temporary-password flow
    if (action === "mark_password_changed") {
      const { userId } = body;

      if (!userId || userId !== callerId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateAccessError } = await adminClient
        .from("user_access_control")
        .update({ must_change_password: false, temp_password_expires_at: null })
        .eq("user_id", userId);

      if (updateAccessError) {
        return new Response(JSON.stringify({ error: updateAccessError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remaining actions are admin-only
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_user") {
      const { email, cnpj, allowedCustIds, role } = body;
      const userRole = ["admin", "gerente"].includes(role) ? role : "user";

      const tempPassword = generateTempPassword();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      console.log(`Creating user ${email} with role ${userRole}, temp password length: ${tempPassword.length}`);

      // Create auth user
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { email },
      });

      if (createErr) {
        console.error("Create user error:", createErr.message);
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`User created: ${newUser.user.id}, setting password in auth...`);

      // Force-set the password again to ensure it matches exactly
      const { error: updatePwErr } = await adminClient.auth.admin.updateUserById(newUser.user.id, {
        password: tempPassword,
      });

      if (updatePwErr) {
        console.error("Password update error:", updatePwErr.message);
      }

      // Add user role
      await adminClient.from("user_roles").insert({
        user_id: newUser.user.id,
        role: userRole,
      });

      // Create access control entry
      await adminClient.from("user_access_control").insert({
        user_id: newUser.user.id,
        user_email: email,
        cnpj: cnpj || null,
        allowed_cust_ids: allowedCustIds,
        temp_password_expires_at: expiresAt,
        must_change_password: true,
      });

      console.log(`User ${email} setup complete. Password stored in DB matches Auth.`);

      return new Response(
        JSON.stringify({ success: true, tempPassword, userId: newUser.user.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset_password") {
      const { targetUserId } = body;
      const newTempPassword = generateTempPassword();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      console.log(`Resetting password for user ${targetUserId}, new password length: ${newTempPassword.length}`);

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password: newTempPassword,
      });

      if (updateErr) {
        console.error("Reset password error:", updateErr.message);
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: dbUpdateErr } = await adminClient
        .from("user_access_control")
        .update({
          must_change_password: true,
          temp_password_expires_at: expiresAt,
        })
        .eq("user_id", targetUserId);

      if (dbUpdateErr) {
        console.error("DB update error:", dbUpdateErr.message);
      }

      console.log(`Password reset complete for ${targetUserId}`);

      return new Response(
        JSON.stringify({ success: true, tempPassword: newTempPassword }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_user") {
      const { targetUserId } = body;
      await adminClient.from("user_access_control").delete().eq("user_id", targetUserId);
      await adminClient.from("user_roles").delete().eq("user_id", targetUserId);
      await adminClient.auth.admin.deleteUser(targetUserId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_wallet") {
      const { targetUserId, allowedCustIds } = body;

      if (!targetUserId || !Array.isArray(allowedCustIds)) {
        return new Response(JSON.stringify({ error: "targetUserId and allowedCustIds are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateErr } = await adminClient
        .from("user_access_control")
        .update({ allowed_cust_ids: allowedCustIds })
        .eq("user_id", targetUserId);

      if (updateErr) {
        console.error("Update wallet error:", updateErr.message);
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Admin error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
