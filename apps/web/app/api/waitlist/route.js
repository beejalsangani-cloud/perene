import mailchimp from "@mailchimp/mailchimp_marketing";

// Extract server prefix from the end of the API key (e.g. "…-us2" → "us2")
const apiKey = process.env.MAILCHIMP_API_KEY;
const server = apiKey?.split("-").at(-1); // "us2"

mailchimp.setConfig({ apiKey, server });

export async function POST(request) {
  const { email } = await request.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please provide a valid email." }, { status: 400 });
  }

  const listId = process.env.MAILCHIMP_AUDIENCE_ID;

  try {
    await mailchimp.lists.addListMember(listId, {
      email_address: email.toLowerCase().trim(),
      status: "subscribed",
    });

    return Response.json({ message: "You're on the list!" }, { status: 201 });
  } catch (err) {
    // The Mailchimp SDK puts the response body as a JSON string in err.response.text
    const status = err.status ?? err.response?.status;
    let body = {};
    try {
      body = JSON.parse(err.response?.text ?? "{}");
    } catch {}
    const title = body?.title;

    // "Member Exists" means already subscribed — treat as success
    if (status === 400 && title === "Member Exists") {
      return Response.json({ message: "You're already on the waitlist!" }, { status: 200 });
    }

    console.error("Mailchimp error:", status, title, body?.detail);
    return Response.json({ error: "Something went wrong — please try again." }, { status: 500 });
  }
}
