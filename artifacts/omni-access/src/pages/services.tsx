import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CheckCircle2, Shield, Code, Map, Scale, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Services() {
  return (
    <div className="flex flex-col w-full" data-testid="page-services">
      {/* Header */}
      <section className="bg-primary text-primary-foreground py-20 px-4">
        <div className="container mx-auto max-w-5xl text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight" data-testid="services-headline">
            Capabilities & Pricing
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto" data-testid="services-subheadline">
            Transparent expertise designed to fundamentally fix your product's code, not just check a box.
          </p>
        </div>
      </section>

      {/* Services Detail */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-serif font-bold tracking-tight text-primary">Core Services</h2>
            <p className="text-muted-foreground text-lg">Deep technical consulting tailored for engineering teams.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-border shadow-sm hover:shadow-md transition-all" data-testid="service-detail-audit">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-serif mb-2">Manual Source-Code Audit</CardTitle>
                  <CardDescription className="text-base">Rigorous testing beyond automated tools.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Our experts manually review critical user flows using native screen readers (JAWS, NVDA, VoiceOver) and keyboard-only navigation. We provide a detailed technical report grading against WCAG 2.2 AA/AAA, with exact code snippets indicating why an element fails and how to fix it.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm hover:shadow-md transition-all" data-testid="service-detail-training">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Code className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-serif mb-2">Developer Training</CardTitle>
                  <CardDescription className="text-base">Empowering your team to build accessible UI natively.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We don't just hand over a PDF; we teach your team. Intensive workshop series focusing on component-level accessibility patterns (React, Vue, Native), semantic HTML principles, complex ARIA state management, and integrating automated checks into your CI/CD pipeline.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm hover:shadow-md transition-all" data-testid="service-detail-roadmap">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Map className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-serif mb-2">Remediation Roadmap</CardTitle>
                  <CardDescription className="text-base">A structured, realistic plan for fixing issues.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Audits can be overwhelming. We distill findings into a structured 90-day plan, creating a prioritized issue backlog that separates quick wins from structural refactors. Includes developer handoff documentation ready to be dropped into Jira or Linear.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm hover:shadow-md transition-all" data-testid="service-detail-consulting">
              <CardHeader className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Scale className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-serif mb-2">Strategy Consulting</CardTitle>
                  <CardDescription className="text-base">Navigating legal requirements and scaling programs.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Designed for executive leadership. We conduct enterprise-wide legal risk assessments, prepare documentation for European Accessibility Act (EAA) readiness, and help design internal procurement policies to ensure third-party vendors meet your accessibility standards.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 bg-muted/30 border-y border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-serif font-bold tracking-tight text-primary">Engagement Tiers</h2>
            <p className="text-muted-foreground text-lg">Clear scoping for businesses of any size.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Tier */}
            <Card className="flex flex-col bg-card relative" data-testid="pricing-starter">
              <CardHeader>
                <CardTitle className="text-xl font-bold font-serif text-primary">Starter</CardTitle>
                <CardDescription>For small teams needing baseline assessment.</CardDescription>
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-3xl font-bold">From $2,400</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>Site audit up to 20 distinct pages</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>Written technical remediation report</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>30-day post-audit Q&A support</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild data-testid="btn-tier-starter">
                  <Link href="/#consultation">Contact Us</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Professional Tier */}
            <Card className="flex flex-col bg-card border-primary relative shadow-lg transform md:-translate-y-4" data-testid="pricing-professional">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle className="text-xl font-bold font-serif text-primary">Professional</CardTitle>
                <CardDescription>Comprehensive overhaul for active products.</CardDescription>
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-3xl font-bold">From $8,000</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="font-medium text-foreground">Full web application audit</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="font-medium text-foreground">2-Day Developer Training Workshop</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="font-medium text-foreground">Structured 90-day remediation roadmap</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>90-day engineering support</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild data-testid="btn-tier-professional">
                  <Link href="/#consultation">Contact Us</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Enterprise Tier */}
            <Card className="flex flex-col bg-card relative" data-testid="pricing-enterprise">
              <CardHeader>
                <CardTitle className="text-xl font-bold font-serif text-primary">Enterprise</CardTitle>
                <CardDescription>Embedded capability for large organizations.</CardDescription>
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-3xl font-bold">Custom Pricing</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>Ongoing monitoring via Platform Dashboard</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>Dedicated Lead Consultant</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>Quarterly team training</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>Legal defense documentation</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild data-testid="btn-tier-enterprise">
                  <Link href="/#consultation">Contact Us</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="py-24 px-4 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto max-w-3xl space-y-8">
          <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">Ready to fix the code?</h2>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Stop relying on overlays that don't protect you or your users. Build genuine accessibility that scales with your product.
          </p>
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground h-14 px-8 text-lg font-bold" asChild data-testid="btn-bottom-cta">
            <Link href="/#consultation" className="flex items-center gap-2">
              Book Your Consultation <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
