import { useState } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Shield, Code, AlertTriangle, Scale, Monitor, Smartphone, Cpu, CheckCircle2, ArrowRight } from "lucide-react";
import { useCaptureLead } from "@workspace/api-client-react";

function useFadeUp(delay = 0) {
  const shouldReduce = useReducedMotion();
  return {
    initial: shouldReduce ? { opacity: 0 } : { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: shouldReduce ? 0.2 : 0.6, delay: shouldReduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] },
  };
}

function useStaggerContainer() {
  const shouldReduce = useReducedMotion();
  return {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true, margin: "-60px" },
    variants: {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: shouldReduce ? 0 : 0.12,
          delayChildren: shouldReduce ? 0 : 0.1,
        },
      },
    },
  };
}

function useStaggerItem() {
  const shouldReduce = useReducedMotion();
  return {
    variants: {
      hidden: shouldReduce ? { opacity: 0 } : { opacity: 0, y: 28 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: shouldReduce ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] },
      },
    },
  };
}

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const captureLead = useCaptureLead();
  const shouldReduce = useReducedMotion();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    captureLead.mutate(
      { data: { name, email, company, message } },
      { onSuccess: () => setSubmitted(true) }
    );
  };

  const staggerContainer = useStaggerContainer();
  const staggerItem = useStaggerItem();

  return (
    <div className="flex flex-col w-full">
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-24 md:py-32 px-4">
        <div className="container mx-auto max-w-5xl text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduce ? 0.2 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 px-4 py-1.5 border-none mb-4" data-testid="hero-badge">
              The Anti-Overlay Governance Platform
            </Badge>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-balance leading-tight"
            data-testid="hero-headline"
            initial={{ opacity: 0, y: shouldReduce ? 0 : 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduce ? 0.2 : 0.65, delay: shouldReduce ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            We don't apply band-aids. <br className="hidden md:block" />
            <span className="text-accent">We fix the code.</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed"
            data-testid="hero-subheadline"
            initial={{ opacity: 0, y: shouldReduce ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduce ? 0.2 : 0.6, delay: shouldReduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            Accessibility overlays expose you to legal risk and alienate users. OmniAccess provides deep source-code auditing, developer training, and a clear remediation roadmap.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
            initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduce ? 0.2 : 0.55, delay: shouldReduce ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button size="lg" asChild className="w-full sm:w-auto h-14 px-8 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="btn-hero-consultation">
              <a href="#consultation">Book a Consultation</a>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto h-14 px-8 text-base font-semibold border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" data-testid="btn-hero-platform">
              <Link href="/platform">See the Platform</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Why Overlays Fail */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center mb-16 space-y-4" {...useFadeUp()}>
            <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">Why Overlays Fail</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">The industry truth: quick fixes cannot solve structural code problems.</p>
          </motion.div>
          <motion.div className="grid md:grid-cols-2 gap-8" {...staggerContainer}>
            <motion.div {...staggerItem}>
              <Card className="border-border shadow-sm h-full" data-testid="card-fail-dom">
                <CardHeader>
                  <Code className="h-10 w-10 text-primary mb-4" />
                  <CardTitle className="text-xl font-serif">DOM Injection Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Overlays inject arbitrary JavaScript into the DOM after page load, causing unpredictable layout shifts, race conditions, and performance degradation that disrupts the user experience.</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div {...staggerItem}>
              <Card className="border-border shadow-sm h-full" data-testid="card-fail-aria">
                <CardHeader>
                  <AlertTriangle className="h-10 w-10 text-primary mb-4" />
                  <CardTitle className="text-xl font-serif">ARIA Conflicts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Automated tools frequently apply incorrect or conflicting ARIA attributes. A screen reader interpreting a badly structured `aria-live` region is often worse than no ARIA at all.</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div {...staggerItem}>
              <Card className="border-border shadow-sm h-full" data-testid="card-fail-screenreader">
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-4" />
                  <CardTitle className="text-xl font-serif">Screen Reader Interference</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Users who rely on assistive technology already have their own configured software. Overlays hijack these native controls, creating a frustrating and confusing experience for actual users.</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div {...staggerItem}>
              <Card className="border-border shadow-sm h-full" data-testid="card-fail-legal">
                <CardHeader>
                  <Scale className="h-10 w-10 text-primary mb-4" />
                  <CardTitle className="text-xl font-serif">Legal Exposure</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Over 400 ADA Title III lawsuits in 2022 explicitly named accessibility overlays as a reason for the suit. They do not provide legal protection because they do not achieve true WCAG compliance.</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How OmniAccess Works */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-5xl">
          <motion.div className="text-center mb-16 space-y-4" {...useFadeUp()}>
            <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">The OmniAccess Methodology</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">A structured roadmap to true, permanent accessibility.</p>
          </motion.div>
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row gap-8 items-start relative before:absolute before:inset-0 before:left-[27px] md:before:left-1/2 before:-translate-x-px md:before:translate-x-0 before:w-0.5 before:bg-border before:z-0">
              {/* Phase 1 */}
              <motion.div className="w-full flex flex-col md:flex-row items-start gap-6 md:gap-0 relative z-10" data-testid="phase-1" {...useFadeUp(0)}>
                <div className="md:w-1/2 md:pr-12 md:text-right flex flex-row-reverse md:flex-col items-start md:items-end justify-between md:justify-start w-full gap-4 md:gap-0">
                  <div className="flex-1 md:w-full">
                    <h3 className="text-xl font-bold font-serif mb-2">Phase 1: Web</h3>
                    <p className="text-muted-foreground">Comprehensive source-code audits of your marketing sites and web applications. We identify structural issues and provide exact code-level fixes.</p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2 md:top-0 border-4 border-background shadow-sm">
                    <Monitor className="h-6 w-6" />
                  </div>
                </div>
                <div className="md:w-1/2 md:pl-12 hidden md:block"></div>
              </motion.div>

              {/* Phase 2 */}
              <motion.div className="w-full flex flex-col md:flex-row items-start gap-6 md:gap-0 relative z-10" data-testid="phase-2" {...useFadeUp(0.15)}>
                <div className="md:w-1/2 md:pr-12 hidden md:block"></div>
                <div className="md:w-1/2 md:pl-12 flex flex-row md:flex-col items-start justify-start w-full gap-4 md:gap-0">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2 md:top-0 border-4 border-background shadow-sm">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold font-serif mb-2">Phase 2: Mobile Native</h3>
                    <p className="text-muted-foreground">Deep dive into iOS and Android applications. We work with your mobile engineers to implement platform-specific accessibility APIs correctly.</p>
                  </div>
                </div>
              </motion.div>

              {/* Phase 3 */}
              <motion.div className="w-full flex flex-col md:flex-row items-start gap-6 md:gap-0 relative z-10" data-testid="phase-3" {...useFadeUp(0.3)}>
                <div className="md:w-1/2 md:pr-12 md:text-right flex flex-row-reverse md:flex-col items-start md:items-end justify-between md:justify-start w-full gap-4 md:gap-0">
                  <div className="flex-1 md:w-full">
                    <h3 className="text-xl font-bold font-serif mb-2">Phase 3: Physical Products</h3>
                    <p className="text-muted-foreground">Hardware interface and IoT device auditing. Ensuring physical controls and companion apps meet rigorous accessibility standards.</p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2 md:top-0 border-4 border-background shadow-sm">
                    <Cpu className="h-6 w-6" />
                  </div>
                </div>
                <div className="md:w-1/2 md:pl-12 hidden md:block"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6" {...useFadeUp()}>
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">Our Services</h2>
              <p className="text-muted-foreground text-lg">We don't just find problems. We build the internal capability to solve them permanently.</p>
            </div>
            <Button variant="ghost" asChild className="text-primary hover:text-primary hover:bg-primary/5" data-testid="btn-view-all-services">
              <Link href="/services" className="flex items-center gap-2">
                View all services <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
          <motion.div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" {...staggerContainer}>
            {[
              { testId: "service-audit", title: "Manual Audits", desc: "Deep expert review of critical flows using screen readers and keyboard-only navigation against WCAG 2.2 standards." },
              { testId: "service-training", title: "Developer Training", desc: "Custom workshops teaching your engineers semantic HTML, ARIA patterns, and how to build accessible components from scratch." },
              { testId: "service-roadmap", title: "Remediation Roadmaps", desc: "Prioritized, structured sprint plans that integrate with your existing Jira backlog to fix issues without halting feature work." },
              { testId: "service-consulting", title: "Strategy Consulting", desc: "Enterprise-wide program design to bake accessibility into your design system, CI/CD pipeline, and procurement processes." },
            ].map((s) => (
              <motion.div key={s.testId} {...staggerItem} className="flex">
                <Card className="flex flex-col h-full hover:border-primary/50 transition-colors w-full" data-testid={s.testId}>
                  <CardHeader>
                    <CardTitle className="text-lg font-serif">{s.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Anti-Overlay Manifesto / Compliance Urgency */}
      <section className="py-24 px-4 bg-primary text-primary-foreground overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <motion.h2
                className="text-3xl md:text-5xl font-serif font-bold tracking-tight leading-tight"
                initial={{ opacity: 0, x: shouldReduce ? 0 : -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: shouldReduce ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                The regulatory landscape is shifting rapidly.
              </motion.h2>
              <motion.p
                className="text-primary-foreground/80 text-lg"
                initial={{ opacity: 0, x: shouldReduce ? 0 : -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: shouldReduce ? 0.2 : 0.65, delay: shouldReduce ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                Accessibility is no longer an optional feature. Global legislation is mandating strict compliance, and automated tools will not protect you.
              </motion.p>
              <motion.ul
                className="space-y-4 pt-4"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: shouldReduce ? 0 : 0.13, delayChildren: shouldReduce ? 0 : 0.22 } },
                }}
              >
                {[
                  { testId: "urgency-wcag", title: "WCAG 2.2 Enforced", desc: "New success criteria target focus appearance, pointer targets, and cognitive load." },
                  { testId: "urgency-eaa", title: "European Accessibility Act (2025)", desc: "Mandates sweeping accessibility requirements for any company doing business in the EU." },
                  { testId: "urgency-ada", title: "ADA Title III Litigation", desc: "Record high lawsuits against websites, with courts consistently ruling that overlays do not satisfy ADA requirements." },
                ].map((item) => (
                  <motion.li
                    key={item.testId}
                    className="flex items-start gap-3"
                    data-testid={item.testId}
                    variants={{
                      hidden: shouldReduce ? { opacity: 0 } : { opacity: 0, x: -24 },
                      visible: { opacity: 1, x: 0, transition: { duration: shouldReduce ? 0.2 : 0.5, ease: [0.22, 1, 0.36, 1] } },
                    }}
                  >
                    <CheckCircle2 className="h-6 w-6 text-accent flex-shrink-0" />
                    <div>
                      <strong className="block text-lg">{item.title}</strong>
                      <span className="text-primary-foreground/70">{item.desc}</span>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
            <motion.div
              className="bg-card text-card-foreground p-8 rounded-xl shadow-2xl border border-border"
              initial={{ opacity: 0, x: shouldReduce ? 0 : 48, scale: shouldReduce ? 1 : 0.97 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: shouldReduce ? 0.2 : 0.75, delay: shouldReduce ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="font-serif font-bold text-2xl mb-2 text-primary">Stop guessing about compliance</h3>
                  <p className="text-muted-foreground">Our governance platform gives you exact visibility into your true accessibility posture.</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-border pb-2">
                    <span className="font-medium text-sm text-muted-foreground">Critical Issues Identified</span>
                    <span className="font-serif font-bold text-3xl text-destructive">47</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-border pb-2">
                    <span className="font-medium text-sm text-muted-foreground">Legal Risk Score</span>
                    <span className="font-serif font-bold text-3xl text-orange-500">High</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-border pb-2">
                    <span className="font-medium text-sm text-muted-foreground">Automated Tool Coverage</span>
                    <span className="font-serif font-bold text-3xl text-primary">~25%</span>
                  </div>
                </div>
                <Button className="w-full mt-4" asChild data-testid="btn-urgency-platform">
                  <Link href="/platform">View Platform Dashboard</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center mb-16 space-y-4" {...useFadeUp()}>
            <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">Trusted by Engineering Leaders</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">We work with teams who care about craft and compliance.</p>
          </motion.div>
          <motion.div className="grid md:grid-cols-3 gap-8" {...staggerContainer}>
            {[
              {
                testId: "testimonial-1",
                quote: "\"We ripped out our overlay after a legal threat and brought in OmniAccess. They didn't just audit our site; they trained our React devs on semantic patterns. Our velocity hasn't dropped, but our quality skyrocketed.\"",
                name: "Sarah Jenkins",
                role: "CTO, FinTech Solutions",
              },
              {
                testId: "testimonial-2",
                quote: "\"The platform dashboard gave us executive visibility for the first time. We can actually track our remediation progress against WCAG 2.2 across five different product lines without relying on spreadsheets.\"",
                name: "Marcus Chen",
                role: "VP Engineering, HealthCorp",
              },
              {
                testId: "testimonial-3",
                quote: "\"Their approach to mobile native accessibility is unparalleled. They caught VoiceOver trap issues in our iOS app that three previous auditing firms completely missed. True experts.\"",
                name: "Elena Rodriguez",
                role: "Director of Digital Experience, Retail Giant",
              },
            ].map((t) => (
              <motion.div key={t.testId} {...staggerItem}>
                <Card className="bg-muted/30 border-none shadow-none h-full" data-testid={t.testId}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex text-accent mb-2">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-foreground/80 italic leading-relaxed">{t.quote}</p>
                    <div className="pt-4 border-t border-border">
                      <p className="font-bold text-primary">{t.name}</p>
                      <p className="text-sm text-muted-foreground">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Book a Consultation */}
      <section id="consultation" className="py-24 px-4 bg-muted/50 border-t border-border scroll-mt-16">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="bg-card shadow-lg rounded-2xl overflow-hidden flex flex-col md:flex-row border border-border"
            {...useFadeUp()}
          >
            <div className="bg-primary text-primary-foreground p-10 md:w-2/5 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-serif font-bold mb-4">Let's fix it for real.</h2>
                <p className="text-primary-foreground/80 mb-8">
                  Get a frank assessment of your current accessibility posture and a clear path forward. No band-aids. No false promises.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium">Expert-led audits</span>
                </div>
                <div className="flex items-center gap-3">
                  <Code className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium">Code-level remediation</span>
                </div>
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium">Defensible compliance</span>
                </div>
              </div>
            </div>

            <div className="p-10 md:w-3/5 bg-card">
              {submitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12 animate-in fade-in zoom-in duration-500" data-testid="form-success">
                  <div className="h-16 w-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-primary">Message Received</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Thank you. One of our lead accessibility consultants will review your details and reach out within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-consultation">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="Jane Doe"
                        disabled={captureLead.isPending}
                        data-testid="input-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="jane@company.com"
                        disabled={captureLead.isPending}
                        data-testid="input-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company (Optional)</Label>
                      <Input
                        id="company"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        placeholder="Company Inc."
                        disabled={captureLead.isPending}
                        data-testid="input-company"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">How can we help? (Optional)</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="We received a demand letter regarding our checkout flow..."
                        className="resize-none h-24"
                        disabled={captureLead.isPending}
                        data-testid="input-message"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base"
                    disabled={captureLead.isPending || !name || !email}
                    data-testid="btn-submit-consultation"
                  >
                    {captureLead.isPending ? "Sending..." : "Request Consultation"}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
