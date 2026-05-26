/**
 * Stepper — React Bits Stepper adapted for the cyber-noir workshop palette.
 *
 * Differences from the upstream version:
 *  - Outer chrome is BorderGlow (purple mesh-gradient border + outer glow
 *    on hover near edges) — matches the active QuestionCard look.
 *  - Indicator circles use workshop purple (oklch ~ 290 hue) instead of
 *    the upstream #5227FF.
 *  - Buttons styled with the existing btn-salt-primary gradient.
 *  - Imports framer-motion (project uses v12) instead of `motion/react`.
 *  - Outer container drops the aspect-ratio sizing — flows inline below
 *    the question grid.
 */
import React, {
  Children,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import BorderGlow from "@/components/BorderGlow";

interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  stepContainerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  backButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  nextButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  backButtonText?: string;
  nextButtonText?: string;
  disableStepIndicators?: boolean;
  renderStepIndicator?: (props: {
    step: number;
    currentStep: number;
    onStepClick: (clicked: number) => void;
  }) => ReactNode;
}

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepContainerClassName = "",
  contentClassName = "",
  footerClassName = "",
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = "Back",
  nextButtonText = "Continue",
  disableStepIndicators = false,
  renderStepIndicator,
  ...rest
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [direction, setDirection] = useState<number>(0);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = (newStep: number) => {
    setCurrentStep(newStep);
    if (newStep > totalSteps) onFinalStepCompleted();
    else onStepChange(newStep);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      setDirection(1);
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    setDirection(1);
    updateStep(totalSteps + 1);
  };

  return (
    <div {...rest} style={{ maxWidth: "820px", margin: "0 auto", ...(rest.style ?? {}) }}>
      <BorderGlow
        backgroundColor="var(--card)"
        borderRadius={6}
        glowColor="290 80 70"
        glowRadius={28}
        glowIntensity={0.85}
        edgeSensitivity={28}
        coneSpread={22}
        colors={["#c084fc", "#a855f7", "#7c3aed"]}
      >
        {/* Step indicator row */}
        <div
          className={stepContainerClassName}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "1.25rem 2rem 0.5rem",
          }}
        >
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: (clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    },
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    onClickStep={(clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    }}
                  />
                )}
                {isNotLastStep && (
                  <StepConnector isComplete={currentStep > stepNumber} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          className={contentClassName}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {!isCompleted && (
          <div
            className={footerClassName}
            style={{ padding: "0 2rem 1.25rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: currentStep !== 1 ? "space-between" : "flex-end",
                marginTop: "0.75rem",
                gap: "1rem",
              }}
            >
              {currentStep !== 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--muted-foreground)",
                    padding: "0.55rem 1.1rem",
                    borderRadius: "4px",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--foreground)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "oklch(from var(--foreground) l c h / 0.24)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "var(--muted-foreground)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "var(--border)";
                  }}
                  {...backButtonProps}
                >
                  {backButtonText}
                </button>
              )}
              <button
                type="button"
                onClick={isLastStep ? handleComplete : handleNext}
                className="btn-salt-primary"
                style={{
                  width: "auto",
                  padding: "0.55rem 1.6rem",
                  fontSize: "0.85rem",
                }}
                {...nextButtonProps}
              >
                <span style={{ position: "relative", zIndex: 1 }}>
                  {isLastStep ? "Complete" : nextButtonText}
                </span>
              </button>
            </div>
          </div>
        )}
      </BorderGlow>
    </div>
  );
}

interface StepContentWrapperProps {
  isCompleted: boolean;
  currentStep: number;
  direction: number;
  children: ReactNode;
  className?: string;
}

function StepContentWrapper({
  isCompleted,
  currentStep,
  direction,
  children,
  className = "",
}: StepContentWrapperProps) {
  const [parentHeight, setParentHeight] = useState<number>(0);
  // Skip the first measurement transition. Without this, parentHeight
  // starts at 0 and animates via spring up to the measured value on
  // mount — which combined with the outer fade-in produces a visible
  // two-stage "card grows" effect. After mount, step transitions use
  // the spring normally.
  const measuredRef = useRef(false);
  return (
    <motion.div
      style={{ position: "relative", overflow: "hidden" }}
      initial={false}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={
        measuredRef.current
          ? { type: "spring", duration: 0.4 }
          : { duration: 0 }
      }
      className={className}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideTransition
            key={currentStep}
            direction={direction}
            onHeightReady={(h) => {
              setParentHeight(h);
              // After the first height comes in, future updates (step
              // changes) animate via the spring transition above.
              if (!measuredRef.current) {
                // Defer so the duration-0 transition runs for this
                // update before we flip the ref.
                requestAnimationFrame(() => {
                  measuredRef.current = true;
                });
              }
            }}
          >
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface SlideTransitionProps {
  children: ReactNode;
  direction: number;
  onHeightReady: (height: number) => void;
}

function SlideTransition({ children, direction, onHeightReady }: SlideTransitionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (containerRef.current) onHeightReady(containerRef.current.offsetHeight);
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
      style={{ position: "absolute", left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}

const stepVariants: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "-100%" : "100%",
    opacity: 0,
  }),
  center: { x: "0%", opacity: 1 },
  exit: (dir: number) => ({
    x: dir >= 0 ? "50%" : "-50%",
    opacity: 0,
  }),
};

interface StepProps {
  children: ReactNode;
}

export function Step({ children }: StepProps) {
  return <div style={{ padding: "0.5rem 2rem 0.75rem" }}>{children}</div>;
}

interface StepIndicatorProps {
  step: number;
  currentStep: number;
  onClickStep: (clicked: number) => void;
  disableStepIndicators?: boolean;
}

function StepIndicator({
  step,
  currentStep,
  onClickStep,
  disableStepIndicators = false,
}: StepIndicatorProps) {
  const status =
    currentStep === step
      ? "active"
      : currentStep < step
        ? "inactive"
        : "complete";

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) {
      onClickStep(step);
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      animate={status}
      initial={false}
      style={{
        position: "relative",
        outline: "none",
        cursor: disableStepIndicators ? "default" : "pointer",
        opacity: disableStepIndicators ? 0.5 : 1,
        pointerEvents: disableStepIndicators ? "none" : "auto",
      }}
    >
      <motion.div
        variants={{
          inactive: {
            scale: 1,
            backgroundColor: "oklch(from var(--foreground) l c h / 0.08)",
            color: "var(--muted-foreground)",
            boxShadow: "0 0 0 1px var(--border) inset",
          },
          active: {
            scale: 1.05,
            backgroundColor: "oklch(0.52 0.28 290)",
            color: "oklch(0.98 0 0)",
            boxShadow: "0 0 18px oklch(0.6 0.28 290 / 0.6)",
          },
          complete: {
            scale: 1,
            backgroundColor: "oklch(0.52 0.28 290 / 0.85)",
            color: "oklch(0.98 0 0)",
            boxShadow: "0 0 10px oklch(0.6 0.28 290 / 0.4)",
          },
        }}
        transition={{ duration: 0.3 }}
        style={{
          display: "flex",
          height: "32px",
          width: "32px",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.85rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        {status === "complete" ? (
          <CheckIcon style={{ height: "16px", width: "16px" }} />
        ) : status === "active" ? (
          <div
            style={{
              height: "10px",
              width: "10px",
              borderRadius: "50%",
              background: "oklch(0.98 0 0)",
            }}
          />
        ) : (
          <span>{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

interface StepConnectorProps {
  isComplete: boolean;
}

function StepConnector({ isComplete }: StepConnectorProps) {
  const lineVariants: Variants = {
    incomplete: { width: 0, backgroundColor: "transparent" },
    complete: { width: "100%", backgroundColor: "oklch(0.6 0.28 290)" },
  };

  return (
    <div
      style={{
        position: "relative",
        margin: "0 0.6rem",
        height: "2px",
        flex: 1,
        overflow: "hidden",
        borderRadius: "2px",
        background: "var(--border)",
      }}
    >
      <motion.div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
        }}
        variants={lineVariants}
        initial={false}
        animate={isComplete ? "complete" : "incomplete"}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: "tween", ease: "easeOut", duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
