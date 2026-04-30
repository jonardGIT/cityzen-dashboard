"use client";

import {
  AppstoreOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Card, Typography } from "antd";
import type { ReactNode } from "react";
import styles from "./AuthExperienceShell.module.css";

const { Text, Title } = Typography;

interface AuthExperienceShellProps {
  eyebrow: string;
  heroTitle: string;
  heroDescription: ReactNode;
  cardTitle: string;
  cardDescription: ReactNode;
  securityPrompt: ReactNode;
  children: ReactNode;
}

const HIGHLIGHTS = [
  {
    key: "minimal",
    icon: <AppstoreOutlined className={styles.trustIcon} />,
    label: "Minimal Layout",
    text: "Clear hierarchy and uncluttered navigation reduce operator friction.",
  },
  {
    key: "responsive",
    icon: <MobileOutlined className={styles.trustIcon} />,
    label: "Responsive Access",
    text: "Consistent interaction patterns across field laptops, tablets, and phones.",
  },
  {
    key: "security",
    icon: <SafetyCertificateOutlined className={styles.trustIcon} />,
    label: "Security Prompts",
    text: "Sign-in gates, reset flows, and MFA checks stay visible without crowding the task flow.",
  },
];

export function AuthExperienceShell({
  eyebrow,
  heroTitle,
  heroDescription,
  cardTitle,
  cardDescription,
  securityPrompt,
  children,
}: AuthExperienceShellProps) {
  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <section className={styles.hero} aria-label="Security overview">
          <div>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <Title level={1} className={styles.heroTitle}>
              {heroTitle}
            </Title>
            <Text type="secondary" className={styles.heroText}>
              {heroDescription}
            </Text>
          </div>
          <div className={styles.trustPanel}>
            {HIGHLIGHTS.map((highlight) => (
              <div key={highlight.key} className={styles.trustCard}>
                {highlight.icon}
                <Text className={styles.trustLabel}>{highlight.label}</Text>
                <Text className={styles.trustText}>{highlight.text}</Text>
              </div>
            ))}
          </div>
        </section>

        <Card className={styles.card} styles={{ body: { padding: 32 } }}>
          <div className={styles.cardHeader}>
            <Title level={3} className={styles.cardTitle}>
              {cardTitle}
            </Title>
            <Text type="secondary">{cardDescription}</Text>
            <div className={styles.securityPrompt}>
              <SafetyCertificateOutlined
                className={styles.securityPromptIcon}
              />
              <Text className={styles.securityPromptText}>
                {securityPrompt}
              </Text>
            </div>
          </div>
          <div className={styles.body}>{children}</div>
        </Card>
      </div>
    </div>
  );
}
