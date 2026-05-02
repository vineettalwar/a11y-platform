import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Menu, LayoutDashboard, ClipboardCheck, AlertCircle, BarChart2, Settings, MessageSquare, UserCircle2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import ChatWidget from "./chat-widget";
import AccessibilityToolbar from "./accessibility-toolbar";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, testId: "link-dashboard" },
  { href: "/platform", label: "Audits", icon: ClipboardCheck, testId: "link-audits" },
  { href: "/issues", label: "Issues", icon: AlertCircle, testId: "link-issues" },
  { href: "/reports", label: "Reports", icon: BarChart2, testId: "link-reports" },
  { href: "/settings", label: "Settings", icon: Settings, testId: "link-settings" },
];

function NavLink({
  href,
  label,
  icon: Icon,
  testId,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  testId?: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [toolbarDismissed, setToolbarDismissed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const sidebarTop = toolbarDismissed ? 0 : "2.25rem";

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans"
      style={{ paddingTop: toolbarDismissed ? 0 : "2.25rem" }}
    >
      <AccessibilityToolbar onDismissedChange={setToolbarDismissed} />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside
          className="hidden md:flex flex-col fixed inset-y-0 left-0 z-40 w-56 border-r border-border bg-card"
          style={{ top: sidebarTop }}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 py-4 border-b border-border flex-shrink-0">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-serif font-bold text-lg tracking-tight">OmniAccess</span>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={item.href === "/" ? location === "/" : location.startsWith(item.href)}
              />
            ))}
          </nav>

          {/* Bottom utility area */}
          <div className="px-2 py-3 border-t border-border space-y-1 flex-shrink-0">
            <button
              data-testid="btn-aria-chat"
              aria-label="Open Aria chat assistant"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors text-left"
              onClick={() => setChatOpen(true)}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span>Aria Assistant</span>
            </button>
          </div>

          {/* User account area */}
          <div className="px-3 py-3 border-t border-border flex items-center gap-3 flex-shrink-0">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">Acme Corp</p>
              <p className="text-[11px] text-muted-foreground truncate">Professional Plan</p>
            </div>
          </div>
        </aside>

        {/* Mobile header */}
        <header
          className="md:hidden fixed left-0 right-0 z-40 border-b border-border bg-card/95 backdrop-blur"
          style={{ top: sidebarTop }}
        >
          <div className="h-14 flex items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2" data-testid="link-home">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-serif font-bold text-lg tracking-tight">OmniAccess</span>
            </Link>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open Aria chat assistant"
                data-testid="btn-aria-chat-mobile"
                onClick={() => setChatOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open navigation"
                    data-testid="hamburger-menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="font-serif font-bold text-lg tracking-tight">OmniAccess</span>
                  </div>
                  <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => (
                      <SheetClose key={item.href} asChild>
                        <NavLink
                          {...item}
                          active={item.href === "/" ? location === "/" : location.startsWith(item.href)}
                          onClick={() => setMobileOpen(false)}
                        />
                      </SheetClose>
                    ))}
                  </nav>
                  <div className="px-3 py-3 border-t border-border flex items-center gap-3 flex-shrink-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <UserCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">Acme Corp</p>
                      <p className="text-[11px] text-muted-foreground truncate">Professional Plan</p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 md:ml-56">
          <main id="main-content" className="min-h-[100dvh]">
            <div className="md:hidden h-14" />
            {children}
          </main>
        </div>
      </div>

      <ChatWidget open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
