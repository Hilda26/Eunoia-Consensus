"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Button, Card, Badge, SectionLabel } from "@/components/ui/Primitives";
import { Logo } from "@/components/ui/Logo";

export default function Landing() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  function handleEnter() {
    if (authenticated) router.push("/overview");
    else login();
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="flex items-center justify-between px-8 py-5 border-b border-line">
        <Logo size={32} className="text-2xl" />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/vault" className="text-muted hover:text-ink">Privacy</Link>
          <Button onClick={handleEnter} disabled={!ready}>{authenticated ? "Enter Eunoia" : "Sign in"}</Button>
        </nav>
      </header>

      <section className="px-8 py-20 max-w-6xl mx-auto">
        <span className="section-num">a quiet space for accountability</span>
        <h1 className="font-head text-5xl md:text-7xl mt-3 leading-[1.05]">
          Your private wellness<br />accountability rail.
        </h1>
        <p className="text-muted text-lg mt-6 max-w-2xl">
          Gentle reflections, simple commitments, and a calm record of how the week is going. Your private notes stay on this device.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={handleEnter} disabled={!ready}>{authenticated ? "Enter Eunoia" : "Sign in with email or wallet"}</Button>
          <Link href="/vault"><Button variant="secondary">See what stays private</Button></Link>
        </div>
      </section>

      <section className="px-8 py-16 max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        {[
          { n: "01 /", t: "A quiet log", d: "Log mood, stress, sleep, energy, and a short private note. Nothing is shared until you choose." },
          { n: "02 /", t: "Small commitments", d: "Set gentle, achievable accountability goals and check them off without shame." },
          { n: "03 /", t: "Bounded reflections", d: "A short reflection appears when your signals shift. No diagnosis, no pressure." },
          { n: "04 /", t: "Anonymous circles", d: "Talk with others under an alias. Replies are reviewed for safety before they appear." },
          { n: "05 /", t: "Consent you control", d: "Decide what is shared, with whom, and for how long. Revoke at any time." },
          { n: "06 /", t: "Safety boundaries", d: "Eunoia is not therapy, not medical care, and not crisis support. It is a quiet companion." }
        ].map(b => (
          <Card key={b.n}>
            <span className="section-num">{b.n}</span>
            <h3 className="font-head text-xl mt-1">{b.t}</h3>
            <p className="text-sm text-muted mt-3">{b.d}</p>
          </Card>
        ))}
      </section>

      <section className="px-8 py-16 max-w-6xl mx-auto">
        <Card>
          <SectionLabel number="07 /" label="A note on safety" />
          <p className="text-sm text-muted mt-3 max-w-3xl">
            Eunoia is a wellness accountability product. It does not provide medical diagnosis, therapy, treatment, crisis support, or emergency care. If you may be in immediate danger, contact local emergency services or someone you trust immediately.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="ok">non-medical</Badge>
            <Badge tone="accent">private by default</Badge>
            <Badge tone="info">no shame</Badge>
          </div>
        </Card>
      </section>

      <footer className="px-8 py-10 border-t border-line text-xs text-muted">
        Eunoia - private wellness accountability.
      </footer>
    </div>
  );
}
