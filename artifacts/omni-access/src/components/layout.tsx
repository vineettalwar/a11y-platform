import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import ChatWidget from "./chat-widget";
import AccessibilityToolbar from "./accessibility-toolbar";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <AccessibilityToolbar />
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-serif font-bold text-xl tracking-tight">OmniAccess</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/platform" 
              className={`text-sm font-medium transition-colors hover:text-primary ${location === "/platform" ? "text-primary" : "text-muted-foreground"}`}
              data-testid="link-platform"
            >
              Platform
            </Link>
            <Link 
              href="/services" 
              className={`text-sm font-medium transition-colors hover:text-primary ${location === "/services" ? "text-primary" : "text-muted-foreground"}`}
              data-testid="link-services"
            >
              Services
            </Link>
            <Button asChild size="sm" className="ml-2 font-semibold">
              <Link href="/#consultation" data-testid="link-book-consultation">
                Book Consultation
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-serif font-bold text-xl">OmniAccess</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm">
              The anti-overlay accessibility platform. We fix the root problem at the source.
              Precision engineering meets social conscience.
            </p>
          </div>
          <div>
            <h4 className="font-serif font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/platform" className="hover:text-primary transition-colors">Governance Dashboard</Link></li>
              <li><Link href="/services" className="hover:text-primary transition-colors">Remediation Roadmap</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors">Manifesto</Link></li>
              <li><Link href="/services" className="hover:text-primary transition-colors">Services</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} OmniAccess. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}
