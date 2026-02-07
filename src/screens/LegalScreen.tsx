import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Legal'>;

// ─── Privacy Policy Content ───────────────────────────────────────────────────

const privacyContent = {
  title: 'Privacy Policy',
  effectiveDate: 'February 6, 2026',
  summary:
    'HourFlow stores all your data locally on your device. We do not collect, transmit, or store your personal or business information on any server.',
  sections: [
    {
      heading: '1. Introduction',
      body: 'HourFlow ("we," "our," or "the app") is a time tracking and invoicing application developed by Emerson Ader. This Privacy Policy explains how we handle information when you use our iOS application.\n\nWe are committed to protecting your privacy. HourFlow is designed as an offline-first application, meaning your data stays on your device.',
    },
    {
      heading: '2. Information We Collect',
      body: 'HourFlow allows you to enter and store the following types of information, all of which is kept locally on your device:',
      bullets: [
        'Business information (name, phone, email, address)',
        'Client information (names, phone numbers, email addresses, street addresses)',
        'Time tracking sessions (start/end times, durations, dates, notes)',
        'Invoices and billing records',
        'Hourly rates and material costs',
        'Business logo and app color preferences',
        'Payment method details (PayPal, Venmo, Zelle, Cash App, Stripe usernames/links)',
      ],
      afterBullets:
        'We do not collect, transmit, or have access to any of this data. All information is stored in a local SQLite database on your device and never leaves your phone.',
    },
    {
      heading: '3. How We Use Your Information',
      body: 'Since all data remains on your device, we do not "use" your information in any way. The data you enter is used solely by the app on your device to:',
      bullets: [
        'Track time for your clients',
        'Generate and send invoices',
        'Display reports and summaries',
        'Customize the app\'s appearance',
      ],
    },
    {
      heading: '4. Data Storage & Security',
      body: 'Your data is stored locally on your device using a SQLite database. We do not operate servers or cloud infrastructure to store your data. This means:',
      bullets: [
        'Your data is as secure as your device itself',
        'If you delete the app, your data is permanently removed',
        'We cannot recover your data if it is lost',
        'We recommend using your device\'s built-in backup features (e.g., iCloud device backups) to protect against data loss',
      ],
    },
    {
      heading: '5. Third-Party Services',
      body: 'HourFlow uses the following third-party services:',
      bullets: [
        'Stripe — We use Stripe to manage subscriptions. Stripe may collect purchase and subscription data associated with your email. This does not include your business or client information.',
        'Apple App Store / StoreKit — Subscription purchases are processed through Apple\'s App Store. Apple\'s handling of your payment information is governed by Apple\'s Privacy Policy.',
      ],
      afterBullets:
        'We do not use any analytics, advertising, or crash-reporting services.',
    },
    {
      heading: '6. Data Sharing',
      body: 'We do not sell, trade, rent, or otherwise share your personal information with third parties. Since your data is stored only on your device, we have no access to it.\n\nWhen you choose to send an invoice via email or SMS, the invoice content is shared directly from your device through your device\'s mail or messaging app. We do not intercept or store these communications.',
    },
    {
      heading: '7. Children\'s Privacy',
      body: 'HourFlow is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided information through the app, please contact us so we can assist you.',
    },
    {
      heading: '8. Your Rights',
      body: 'Because all data is stored locally on your device, you have complete control over it. You can:',
      bullets: [
        'View, edit, or delete any data within the app at any time',
        'Delete all data by uninstalling the app',
        'Export your data using the app\'s export features (where available)',
      ],
    },
    {
      heading: '9. Changes to This Policy',
      body: 'We may update this Privacy Policy from time to time. Any changes will be reflected with a new effective date. We encourage you to review this policy periodically. Continued use of the app after changes constitutes acceptance of the updated policy.',
    },
    {
      heading: '10. Contact Us',
      body: 'If you have any questions or concerns about this Privacy Policy, please contact us at:\n\nemersonader@gmail.com',
    },
  ],
};

// ─── Terms of Service Content ─────────────────────────────────────────────────

const termsContent = {
  title: 'Terms of Service',
  effectiveDate: 'February 6, 2026',
  sections: [
    {
      heading: '1. Acceptance of Terms',
      body: 'By downloading, installing, or using HourFlow ("the app"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the app.\n\nHourFlow is developed and maintained by Emerson Ader ("we," "us," or "our").',
    },
    {
      heading: '2. Description of Service',
      body: 'HourFlow is a mobile application designed for freelancers and tradespeople to track working hours, manage clients, and generate invoices. The app operates entirely offline, storing all data locally on your device.\n\nKey features include:',
      bullets: [
        'Time tracking with start/stop timer functionality',
        'Client management (contact details, hourly rates)',
        'Invoice generation and sending (via email or SMS)',
        'Reporting and analytics',
        'Customizable business branding',
        'Material and expense tracking',
      ],
    },
    {
      heading: '3. Subscription Terms',
      body: 'HourFlow offers both free and premium subscription tiers:',
      bullets: [
        'Free Tier: Limited to a set number of clients and features as described within the app.',
        'Premium Subscription: Unlocks all features including unlimited clients, custom branding, PDF export, and more.',
      ],
      afterBullets:
        'Premium subscriptions are billed through the Apple App Store as auto-renewing subscriptions. By subscribing:\n\n• Payment will be charged to your Apple ID account at confirmation of purchase.\n• Your subscription will automatically renew unless you cancel at least 24 hours before the end of the current period.\n• Your account will be charged for renewal within 24 hours prior to the end of the current period.\n• You can manage and cancel your subscription in your Apple ID account settings.\n• Any unused portion of a free trial period will be forfeited when you purchase a subscription.\n\nRefunds are handled by Apple in accordance with their refund policies.',
    },
    {
      heading: '4. User Responsibilities',
      body: 'You are responsible for:',
      bullets: [
        'All data you enter into the app, including its accuracy and legality',
        'Maintaining the security of your device and the data stored within the app',
        'Backing up your data regularly',
        'Ensuring your use of the app complies with applicable laws',
        'The content of any invoices you send to your clients through the app',
      ],
      afterBullets:
        'You agree not to use the app for any unlawful purpose or in any way that could damage, disable, or impair the app.',
    },
    {
      heading: '5. Intellectual Property',
      body: 'The app, including its design, code, graphics, logos, and all content provided by us, is owned by Emerson Ader and is protected by copyright and other intellectual property laws.\n\nYou are granted a limited, non-exclusive, non-transferable license to use the app for personal and business purposes. You may not:',
      bullets: [
        'Copy, modify, or distribute the app or its content',
        'Reverse-engineer, decompile, or disassemble the app',
        'Remove any copyright or proprietary notices',
        'Use the app to create a competing product or service',
      ],
    },
    {
      heading: '6. Disclaimer of Warranties',
      body: 'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.\n\nYou acknowledge that the app is a tool to assist with time tracking and invoicing, and that you are solely responsible for verifying the accuracy of all calculations, invoices, and records generated by the app.',
    },
    {
      heading: '7. Limitation of Liability',
      body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, EMERSON ADER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUES, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF OR INABILITY TO USE THE APP.\n\nOur total liability for any claims arising from your use of the app shall not exceed the amount you paid for the app in the twelve (12) months preceding the claim.',
    },
    {
      heading: '8. Data and Backups',
      body: 'All data created within HourFlow is stored locally on your device. We do not maintain backups of your data. You are solely responsible for backing up your data. Deleting the app will permanently remove all data associated with it.',
    },
    {
      heading: '9. Termination',
      body: 'You may stop using the app at any time by deleting it from your device. We reserve the right to suspend or terminate access to the app if we reasonably believe you are violating these Terms.\n\nUpon termination, your license to use the app is revoked. Sections 5 through 8 shall survive termination.',
    },
    {
      heading: '10. Governing Law',
      body: 'These Terms shall be governed by and construed in accordance with the laws of the United States. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in the United States.',
    },
    {
      heading: '11. Changes to These Terms',
      body: 'We reserve the right to update or modify these Terms at any time. Changes will be reflected with a new effective date. Your continued use of the app after any changes constitutes acceptance of the updated Terms.',
    },
    {
      heading: '12. Contact Us',
      body: 'If you have any questions about these Terms of Service, please contact us at:\n\nemersonader@gmail.com',
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function LegalScreen({ route }: Props) {
  const { type } = route.params;
  const content = type === 'privacy' ? privacyContent : termsContent;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.effectiveDate}>
        Effective Date: {content.effectiveDate}
      </Text>

      {type === 'privacy' && privacyContent.summary ? (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryBold}>Summary: </Text>
            {privacyContent.summary}
          </Text>
        </View>
      ) : null}

      {content.sections.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionHeading}>{section.heading}</Text>
          {section.body ? (
            <Text style={styles.bodyText}>{section.body}</Text>
          ) : null}
          {section.bullets ? (
            <View style={styles.bulletList}>
              {section.bullets.map((bullet, bulletIndex) => (
                <View key={bulletIndex} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {'afterBullets' in section && section.afterBullets ? (
            <Text style={styles.bodyText}>{section.afterBullets}</Text>
          ) : null}
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 HourFlow. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  effectiveDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.lg,
  },
  summaryBox: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderTopRightRadius: BORDER_RADIUS.md,
    borderBottomRightRadius: BORDER_RADIUS.md,
  },
  summaryText: {
    fontSize: FONT_SIZES.md,
    color: '#065F46',
    lineHeight: FONT_SIZES.md * 1.6,
  },
  summaryBold: {
    fontWeight: '700',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeading: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  bodyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray700,
    lineHeight: FONT_SIZES.md * 1.6,
    marginBottom: SPACING.sm,
  },
  bulletList: {
    marginVertical: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
    paddingRight: SPACING.md,
  },
  bulletDot: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    marginRight: SPACING.sm,
    lineHeight: FONT_SIZES.md * 1.6,
  },
  bulletText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.gray700,
    lineHeight: FONT_SIZES.md * 1.6,
  },
  footer: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
});
