export const metadata = { robots: { index: false, follow: false } };

export default function PanelRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="crm-root min-h-[100dvh]">{children}</div>;
}
