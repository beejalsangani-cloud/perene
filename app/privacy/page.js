import { LegalPage, Section, List, Mail } from "@/app/components/LegalPage";
import { SUPPORT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy — Perene",
  description: "How Perene collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_LAST_UPDATED}>
      <p>
        Perene (&ldquo;Perene,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) is an AI personal styling
        service available at myperene.com and in the Perene mobile app. This policy explains what
        information we collect, how we use it, who we share it with, and the choices you have.
      </p>

      <Section title="Information you give us">
        <List
          items={[
            <><strong>Account details:</strong> your email address, password (stored securely by our authentication provider, never visible to us), optional first name, and whether you opted in to marketing emails.</>,
            <><strong>Style profile:</strong> your answers to the style quiz, such as gender, age range, body type, style preferences, colors, typical occasions, lifestyle, and budget. You choose what to share.</>,
            <><strong>Closet photos:</strong> pictures of clothing you take or upload, plus the descriptions we generate for them (category, color, season, notes).</>,
            <><strong>Outfits and activity:</strong> outfits we generate for you, looks you save, the occasions you describe, and items you mark as worn.</>,
            <><strong>Location:</strong> a city or location you enter so we can factor in the weather. We do not track your device&rsquo;s precise location in the background.</>,
          ]}
        />
      </Section>

      <Section title="Information collected automatically">
        <List
          items={[
            <><strong>Usage data:</strong> basic, privacy-friendly analytics about pages visited and features used, which help us improve Perene.</>,
            <><strong>Notification tokens:</strong> if you allow notifications, a device token that lets us deliver them.</>,
            <><strong>Subscription status:</strong> whether you have an active subscription or trial. Payments are handled by Apple; we never receive your card details.</>,
          ]}
        />
      </Section>

      <Section title="How we use your information">
        <List
          items={[
            "To create outfits from your own closet, suggest items that would complete a look, and personalize what you see.",
            "To identify and describe the clothing in your photos.",
            "To run your account, provide customer support, and manage subscriptions.",
            "To send service messages and, only if you opt in, occasional product updates. You can unsubscribe at any time.",
            "To keep Perene secure, prevent abuse, and understand how the product is used so we can improve it.",
          ]}
        />
        <p>
          <strong>We do not sell your personal information</strong>, and we do not use it for
          third-party advertising.
        </p>
      </Section>

      <Section title="AI processing">
        <p>
          Perene uses artificial intelligence from Anthropic to analyze closet photos and generate
          outfit suggestions. To do this, we send the relevant photo or your style profile and closet
          descriptions to Anthropic&rsquo;s service, which processes it and returns a result. AI
          suggestions can be imperfect, so use your own judgment.
        </p>
      </Section>

      <Section title="Who we share information with">
        <p>We share information only with service providers that help us run Perene, and only as needed:</p>
        <List
          items={[
            <><strong>Supabase:</strong> database, account sign-in, and photo storage.</>,
            <><strong>Vercel:</strong> website and server hosting, and usage analytics.</>,
            <><strong>Anthropic:</strong> AI analysis of photos and outfit generation.</>,
            <><strong>remove.bg:</strong> removing backgrounds from closet photos.</>,
            <><strong>Open-Meteo:</strong> weather forecasts for the location you enter.</>,
            <><strong>Unsplash:</strong> style inspiration images (we send search terms, not your personal details).</>,
            <><strong>Mailchimp:</strong> email sign-ups and, if you opt in, marketing emails.</>,
            <><strong>Apple and RevenueCat:</strong> processing and managing in-app subscriptions.</>,
            <><strong>Expo:</strong> delivering push notifications to the mobile app.</>,
          ]}
        />
        <p>
          <strong>Shopping links:</strong> when we suggest items, we may link to retailers, and some
          of these are affiliate links that earn Perene a commission at no extra cost to you. If you
          click one, the retailer and its affiliate network may learn that you arrived from Perene.
          Their own privacy policies apply to anything you do on their sites.
        </p>
        <p>
          We may also disclose information if required by law, to protect the rights and safety of
          our users or others, or as part of a business transfer such as a merger or acquisition.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your information for as long as your account is active. When you delete your
          account, we delete your profile, closet photos, outfits, and saved looks. Limited records
          may remain in backups for a short period, or longer where the law requires it.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <List
          items={[
            <><strong>Delete your account:</strong> in the app, go to Profile and choose Delete account. This permanently removes your data.</>,
            <><strong>Access or correct:</strong> you can view and edit your profile and closet in the app at any time, or email us for a copy of your data.</>,
            <><strong>Marketing emails:</strong> use the unsubscribe link in any email.</>,
            <><strong>Notifications:</strong> turn them off in your device settings.</>,
          ]}
        />
        <p>
          Depending on where you live, including California, you may have additional rights to know,
          access, correct, or delete your personal information. We will not discriminate against you
          for exercising them. To make a request, contact us at <Mail address={SUPPORT_EMAIL} />.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We protect your information with encryption in transit, access controls that limit each
          account to its own data, and secure storage of sign-in credentials on your device. No
          system is perfectly secure, but we work to keep your information safe.
        </p>
      </Section>

      <Section title="Children">
        <p>
          Perene is not intended for children under 13, and we do not knowingly collect their
          information. If you believe a child has given us information, contact us and we will
          delete it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy from time to time. If we make significant changes, we will let
          you know in the app or by email. The date at the top shows when it was last updated.
        </p>
      </Section>

      <Section title="Contact us">
        <p>
          Questions about privacy? Email <Mail address={SUPPORT_EMAIL} />.
        </p>
      </Section>
    </LegalPage>
  );
}
