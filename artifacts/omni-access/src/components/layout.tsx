import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Menu, LogOut, User, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import ChatWidget from "./chat-widget";
import AccessibilityToolbar from "./accessibility-toolbar";
import { useAuth } from "@workspace/replit-auth-web";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [toolbarDismissed, setToolbarDismissed] = useState(false);
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans"
      style={{ paddingTop: toolbarDismissed ? 0 : "2.25rem" }}
    >
      <AccessibilityToolbar onDismissedChange={setToolbarDismissed} />
      <header
        className="sticky z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        style={{ top: toolbarDismissed ? 0 : "2.25rem" }}
      >
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
            <div className="border-l border-border pl-4 ml-2">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {user?.firstName || user?.email || "Account"}
                  </span>
                  <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5 text-muted-foreground h-8 px-2">
                    <LogOut className="w-3.5 h-3.5" />
                    Log out
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={login}>
                  Log in
                </Button>
              )}
            </div>
          </nav>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
                data-testid="hamburger-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col pt-12">
              <nav className="flex flex-col gap-6 mt-4">
                <SheetClose asChild>
                  <Link
                    href="/platform"
                    className={`text-lg font-medium transition-colors hover:text-primary ${location === "/platform" ? "text-primary" : "text-foreground"}`}
                    data-testid="mobile-link-platform"
                  >
                    Platform
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/services"
                    className={`text-lg font-medium transition-colors hover:text-primary ${location === "/services" ? "text-primary" : "text-foreground"}`}
                    data-testid="mobile-link-services"
                  >
                    Services
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild className="w-full font-semibold mt-2">
                    <Link href="/#consultation" data-testid="mobile-link-book-consultation">
                      Book Consultation
                    </Link>
                  </Button>
                </SheetClose>
                <div className="border-t border-border pt-4 mt-2">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : isAuthenticated ? (
                    <div className="flex flex-col gap-3">
                      <span className="text-sm text-muted-foreground">
                        {user?.firstName || user?.email || "Account"}
                      </span>
                      <Button variant="outline" size="sm" onClick={logout} className="gap-2 w-full">
                        <LogOut className="w-3.5 h-3.5" /> Log out
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={login} className="w-full">
                      Log in
                    </Button>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
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
