import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowRightLeft, 
  Droplets, 
  BarChart3, 
  Wallet, 
  X,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  highlight?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FOREDEX! 🐺',
    description: 'Your gateway to decentralized trading on Nexus Testnet. Let\'s take a quick tour to get you started.',
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'connect-wallet',
    title: 'Connect Your Wallet',
    description: 'First, connect your wallet to start trading. We support MetaMask, OKX Wallet, Rabby, and Bitget Wallet.',
    icon: Wallet,
    position: 'top-right',
    highlight: 'header-wallet',
  },
  {
    id: 'swap',
    title: 'Swap Tokens',
    description: 'Exchange tokens instantly with our smart routing. We find the best rates across all liquidity pools automatically.',
    icon: ArrowRightLeft,
    position: 'center',
    highlight: 'swap-card',
  },
  {
    id: 'liquidity',
    title: 'Provide Liquidity',
    description: 'Earn fees by adding liquidity to pools. The more you provide, the more you earn from trading fees.',
    icon: Droplets,
    position: 'center',
  },
  {
    id: 'analytics',
    title: 'Track Performance',
    description: 'Monitor your portfolio, view analytics, and track your trading history all in one place.',
    icon: BarChart3,
    position: 'center',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start trading now or explore more features. Need help? Check our documentation anytime.',
    icon: Check,
    position: 'center',
  },
];

const STORAGE_KEY = 'foredex_onboarding_complete';

export function OnboardingTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay before showing tutorial
      const timer = setTimeout(() => {
        setHasCompleted(false);
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasCompleted(true);
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasCompleted(true);
    setIsOpen(false);
  };

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  if (hasCompleted && !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Tutorial Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed z-50 w-[92vw] max-w-md mx-auto px-2 sm:px-0',
              step.position === 'center' && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              step.position === 'top-left' && 'top-20 sm:top-24 left-2 sm:left-8',
              step.position === 'top-right' && 'top-20 sm:top-24 right-2 sm:right-8',
              step.position === 'bottom-left' && 'bottom-20 sm:bottom-24 left-2 sm:left-8',
              step.position === 'bottom-right' && 'bottom-20 sm:bottom-24 right-2 sm:right-8'
            )}
          >
            <div className="glass-card p-4 sm:p-6 border-2 border-primary/30 shadow-2xl shadow-primary/10">
              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Progress bar */}
              <div className="h-1 bg-muted rounded-full mb-4 sm:mb-6 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/60"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Icon */}
              <motion.div
                key={step.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 mx-auto"
              >
                <step.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </motion.div>

              {/* Content */}
              <motion.div
                key={`content-${step.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-4 sm:mb-6"
              >
                <h3 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  {step.description}
                </p>
              </motion.div>

              {/* Step indicators */}
              <div className="flex justify-center gap-1 sm:gap-1.5 mb-4 sm:mb-6">
                {TUTORIAL_STEPS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300',
                      index === currentStep 
                        ? 'w-4 sm:w-6 bg-primary' 
                        : index < currentStep 
                          ? 'bg-primary/50' 
                          : 'bg-muted'
                    )}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground text-xs sm:text-sm px-2 sm:px-3"
                >
                  Skip
                </Button>

                <Button
                  size="sm"
                  onClick={handleNext}
                  className="gap-1 text-xs sm:text-sm px-2 sm:px-3"
                >
                  {currentStep === TUTORIAL_STEPS.length - 1 ? 'Start' : 'Next'}
                  {currentStep < TUTORIAL_STEPS.length - 1 && <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Button to restart tutorial
export function RestartTutorialButton() {
  const handleRestart = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return (
    <Button variant="outline" size="sm" onClick={handleRestart} className="gap-2">
      <Sparkles className="w-4 h-4" />
      Restart Tutorial
    </Button>
  );
}
