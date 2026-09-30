import Link from "next/link";
import { LegalPage, Section, List, Mail } from "@/app/components/LegalPage";
import { SUPPORT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/site";

export const metadata = {
  title: "Terms of Service — Perene",
  description: "The terms that apply when you use Perene.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_LAST_UPDATED}>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Perene, including the
        website at myperene.com and the Perene mobile app (together, the &ldquo;Service&rdquo;). By
        creating an account or using the Service, you agree to these Terms and to our{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>. If you
        do not agree, please do not use Perene.
      </p>

      <Section title="1. Eligibility and your account">
        <p>
          You must be at least 13 years old to use Perene. You are responsible for keeping your login
          details secure and for activity on your account. Please give us accurate information and
          let us know if you believe your account has been compromised.
        </p>
      </Section>

      <Section title="2. What Perene does">
        <p>
          Perene uses artificial intelligence to organize your closet, suggest outfits, and recommend
          items that could complete a look. Suggestions are for inspiration and convenience only.
          AI can make mistakes, such as misidentifying an item or suggesting something that does not
          suit the occasion, weather, or your preferences, so please use your own judgment.
        </p>
      </Section>

      <Section title="3. Subscriptions, trials, and billing">
        <List
          items={[
            "Some features require a paid subscription. Current plans and prices are shown in the app before you buy.",
            "New subscribers may be offered a free trial. If you do not cancel before the trial ends, your subscription starts and you are charged automatically. Any unused part of a free trial is forfeited when you purchase a subscription.",
            "In the iOS app, payment is charged to your Apple ID account when you confirm the purchase.",
            "Subscriptions renew automatically at the same price and length unless you turn off auto-renew at least 24 hours before the end of the current period. Your account is charged for renewal within the 24 hours before the current period ends.",
            "You can manage or cancel your subscription in your Apple ID account settings (Settings → your name → Subscriptions). Deleting the app or your Perene account does not cancel an Apple subscription.",
            "Refunds for App Store purchases are handled by Apple under its policies.",
          ]}
        />
        <p>
          We may change prices or plans in the future. If we do, we will give you notice as required
          and the change will apply at your next renewal.
        </p>
      </Section>

      <Section title="4. Your content">
        <p>
          You own the photos and information you add to Perene (&ldquo;Your Content&rdquo;). You give
          us a limited license to store, process, and display Your Content only to provide and improve
          the Service for you, including sending it to our AI and service providers as described in
          our Privacy Policy. This license ends when you delete the content or your account, except
          for copies in routine backups that are deleted over time.
        </p>
        <p>
          Please upload only content you have the right to use, and do not upload photos of other
          people without their permission.
        </p>
      </Section>

      <Section title="5. Acceptable use">
        <p>You agree not to:</p>
        <List
          items={[
            "Upload anything unlawful, sexually explicit, hateful, or that infringes someone else's rights.",
            "Attempt to access other users' data or interfere with or overload the Service.",
            "Scrape, copy, reverse engineer, or resell the Service, or use it to build a competing product.",
            "Use the Service for any illegal purpose.",
          ]}
        />
      </Section>

      <Section title="6. Shopping and affiliate links">
        <p>
          Perene may show links to products sold by third-party retailers. Some are affiliate links,
          meaning Perene may earn a commission if you buy, at no extra cost to you. We do not sell
          these products and are not responsible for retailers&rsquo; prices, availability, product
          quality, shipping, or returns. Suggested items are similar matches and may not be exact.
          Your purchases are between you and the retailer.
        </p>
      </Section>

      <Section title="7. Our intellectual property">
        <p>
          The Service, including its design, software, and branding, belongs to Perene and its
          licensors. We grant you a personal, non-transferable, revocable license to use the Service
          for your own non-commercial use in line with these Terms.
        </p>
      </Section>

      <Section title="8. Ending your use">
        <p>
          You can stop using Perene and delete your account at any time from the Profile screen in
          the app. We may suspend or end access if you violate these Terms or if we need to in order
          to protect the Service or other users. We may also change or discontinue features.
        </p>
      </Section>

      <Section title="9. Disclaimers">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest
          extent permitted by law, we disclaim all warranties, express or implied, including
          merchantability, fitness for a particular purpose, and non-infringement. We do not promise
          that the Service will be uninterrupted, error-free, or that AI suggestions will be accurate
          or suitable for you.
        </p>
      </Section>

      <Section title="10. Limitation of liability">
        <p>
          To the fullest extent permitted by law, Perene will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or for lost profits, data, or
          goodwill. Our total liability for any claim relating to the Service is limited to the
          greater of the amount you paid Perene in the 12 months before the claim or $50. Some
          jurisdictions do not allow these limits, so they may not apply to you.
        </p>
      </Section>

      <Section title="11. Apple App Store terms">
        <p>
          If you use the iOS app, these Terms are between you and Perene, not Apple. Apple is not
          responsible for the app or its content, has no obligation to provide maintenance or
          support, and is not responsible for any product or legal claims relating to the app,
          including third-party intellectual property claims. If the app fails to conform to any
          applicable warranty, you may notify Apple for a refund of the purchase price, and Apple has
          no other warranty obligation. Apple and its subsidiaries are third-party beneficiaries of
          these Terms and may enforce them against you. You confirm that you are not located in a
          country subject to a U.S. government embargo and are not on any U.S. government list of
          prohibited or restricted parties.
        </p>
      </Section>

      <Section title="12. Governing law">
        <p>
          These Terms are governed by the laws of the State of California, without regard to its
          conflict-of-law rules. Any dispute will be handled in the state or federal courts located
          in Orange County, California, unless the law where you live requires otherwise.
        </p>
      </Section>

      <Section title="13. Changes to these Terms">
        <p>
          We may update these Terms from time to time. If we make significant changes, we will let
          you know in the app or by email before they take effect. Continuing to use Perene after
          that means you accept the updated Terms.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          Questions about these Terms? Email <Mail address={SUPPORT_EMAIL} />.
        </p>
      </Section>
    </LegalPage>
  );
}
