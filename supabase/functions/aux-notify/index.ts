// The database webhook includes a private Authorization bearer token.
// Configure this function with gateway JWT verification disabled.
Deno.serve(async (request) => {
  const expected = Deno.env.get("AUX_WEBHOOK_SECRET");
  if (request.method !== "POST" || !expected ||
      request.headers.get("Authorization") !== `Bearer ${expected}`) {
    return new Response(null, { status: 401 });
  }

  const { type, table, record } = await request.json();
  if (type !== "INSERT" || table !== "aux_notifications" ||
      !/^[0-9a-f-]{36}$/i.test(record?.application_id ?? "") ||
      !["submitted", "approved"].includes(record?.event)) {
    return new Response(null, { status: 400 });
  }

  const recipient = Deno.env.get("AUX_SECRETARY_EMAIL");
  const sender = Deno.env.get("AUX_FROM_EMAIL");
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const inbox = Deno.env.get("AUX_COMMITTEE_URL");
  if (!recipient || !sender || !apiKey || !inbox) {
    return new Response("Missing notification configuration", { status: 503 });
  }

  const submitted = record.event === "submitted";
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `aux-${record.application_id}-${record.event}`
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: submitted ? "Precursor auxiliar · Nueva solicitud" : "Precursor auxiliar · Solicitud aprobada",
        text: `${submitted ? "Se recibió una solicitud." : "Ya se registraron las tres aprobaciones."}\n\nComité de servicio de Las Brisas Spanish\n${inbox}`
      })
    });
    return new Response(null, { status: result.ok ? 204 : 502 });
  } catch {
    return new Response(null, { status: 502 });
  }
});
