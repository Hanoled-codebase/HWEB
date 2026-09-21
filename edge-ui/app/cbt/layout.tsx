// The online /cbt layout checks HCORE subscriptions server-side (cookies,
// next/headers). On the appliance the paired device already *is* the
// subscription, so this shell just supplies the same theme wrapper.
export default function CBTLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="cbt-theme font-sans antialiased bg-background text-foreground min-h-screen">{children}</div>;
}
