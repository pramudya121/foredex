import { useLocation, Link } from "react-router-dom";
import { useEffect, memo } from "react";
import { AlertTriangle, Home, ArrowLeft, ArrowRightLeft, Droplets, BarChart3, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import wolfLogo from "@/assets/wolf-logo.png";

const QUICK_LINKS = [
  { path: '/swap', label: 'Swap', icon: ArrowRightLeft },
  { path: '/pools', label: 'Pools', icon: Droplets },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/portfolio', label: 'Portfolio', icon: Wallet },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="container min-h-[80vh] flex items-center justify-center px-4 py-12 relative">
      <SEOHead title="Page Not Found" description="The page you're looking for doesn't exist on FOREDEX." />
      
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="glass-card p-8 sm:p-12 text-center max-w-md relative animate-scale-in">
        {/* Wolf Logo with glow */}
        <div className="relative inline-block mb-6">
          <img 
            src={wolfLogo} 
            alt="FOREDEX" 
            className="w-20 h-20 mx-auto opacity-50 animate-wolf-breathe"
          />
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
        </div>
        
        {/* 404 with gradient */}
        <h1 className="text-6xl sm:text-8xl font-bold mb-4 gradient-text">404</h1>
        
        {/* Error icon and message */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <p className="text-lg text-muted-foreground">Page not found</p>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6">
          The page <code className="px-2 py-1 bg-muted rounded text-xs">{location.pathname}</code> doesn't exist or has been moved.
        </p>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Link to="/">
            <Button className="bg-gradient-wolf hover-lift">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="hover-lift"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Quick links */}
        <div className="border-t border-border/30 pt-5">
          <p className="text-xs text-muted-foreground mb-3">Quick links</p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_LINKS.map(link => (
              <Link key={link.path} to={link.path}>
                <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                  <link.icon className="w-3 h-3" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default memo(NotFound);
