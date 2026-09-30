import Link from "next/link";
import { LegalPage, Section, Mail } from "@/app/components/LegalPage";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Support — Perene",
  description: "Get help with Perene: subscriptions, your account, and your closet.",
};

const FAQ = [
  {
    q: "How do I cancel my subscription?",
    a: "On your iPhone, open Settings, tap your name, then Subscriptions, choose Perene, and tap Cancel Subscription. Cancel at least 24 hours before your trial or billing period ends to avoid the next charge. Deleting the app does not cancel the subscription.",
  },
  {
    q: "I already subscribed but the app asks me to pay again.",
    a: "Open the subscription screen in the app and tap Restore Purchases. Make sure you are signed in with the same Apple ID you used to subscribe.",
  },
  {
    q: "How do I get a refund?",
    a: "App Store purchases are refunded by Apple. Request one at reportaproblem.apple.com.",
  },
  {
    q: "How do I delete my account?",
    a: "In the app, go to Profile and tap Delete account. This permanently removes your profile, closet photos, outfits, and saved looks. If you have a subscription, cancel it separately in your Apple settings.",
  },
  {
    q: "An item in my closet was tagged wrong.",
    a: "Open the item in your closet and edit its details. Your outfits use the updated information from then on.",
  },
  {
    q: "My outfit didn't generate.",
    a: "Check your internet connection and try again. If it keeps happening, email us with what you entered and roughly when, and we will look into it.",
  },
];

export default function SupportPage() {
  return (
    <LegalPage title="Support">
      <p className="text-base">
        We&rsquo;re here to help. Email us at <Mail address={SUPPORT_EMAIL} />{" "}and we&rsquo;ll get
        back to you within 2 business days. Including the email address on your Perene account
        helps us find your details faster.
      </p>

      <Section title="Common questions">
        <div className="space-y-6">
          {FAQ.map(({ q, a }) => (
            <div key={q}>
              <h3 className="font-semibold text-[#2A3D2E] mb-1">{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Privacy and terms">
        <p>
          Read our <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>{" "}
          and <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
