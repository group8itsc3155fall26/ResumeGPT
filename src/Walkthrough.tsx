import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Section = "Profile" | "Resume" | "Projects" | "Canvas";
type TooltipPosition = "top" | "right" | "bottom" | "left";

type WalkthroughStep = {
  selector: string;
  title: string;
  description: string;
  position: TooltipPosition;
  section: Section;
};

export const walkthroughSteps: WalkthroughStep[] = [
  {
    selector: "#recent-resumes",
    title: "Recent resumes",
    description:
      "Your tailored resumes are saved here. To create one, open the Resume tab, choose skills, describe your target role, and generate a draft.",
    position: "bottom",
    section: "Profile",
  },
  {
    selector: "#recent-projects",
    title: "Recent projects",
    description:
      "This is a quick look at your latest coursework and personal projects. Choose View all to open your complete project library.",
    position: "top",
    section: "Profile",
  },
  {
    selector: "#about-you-card",
    title: "About you",
    description:
      "Your profile helps ResumeGPT keep your experience relevant. Your name, major, and graduation year are added when you create your account.",
    position: "left",
    section: "Profile",
  },
  {
    selector: "#projects-nav",
    title: "Your project library",
    description:
      "Open Projects to manage the work ResumeGPT can draw from when creating tailored resumes.",
    position: "bottom",
    section: "Profile",
  },
  {
    selector: "#project-actions",
    title: "Add or import projects",
    description:
      "Save personal or independent work with Add project, or bring coursework into your library with Import from Canvas.",
    position: "bottom",
    section: "Projects",
  },
  {
    selector: "#project-filters",
    title: "Find the right experience",
    description:
      "Search project names and skills, or narrow your library by course, semester, and skill. Each project keeps its description and skill tags ready for your next resume.",
    position: "bottom",
    section: "Projects",
  },
  {
    selector: "#resume-nav",
    title: "Open Resume Studio",
    description:
      "Use the Resume tab to turn your saved experience into a role-focused draft. Next, choose the skills and describe the opportunity you have in mind.",
    position: "bottom",
    section: "Projects",
  },
  {
    selector: "#resume-skills",
    title: "Choose skills to highlight",
    description:
      "Select the skills that best match the role. ResumeGPT uses them to find relevant projects and shape your resume draft.",
    position: "right",
    section: "Resume",
  },
  {
    selector: "#resume-role-description",
    title: "Describe your target role",
    description:
      "Enter a job title, company, or experience you want to emphasize. You can also choose one of the suggestions above to fill in a starting point.",
    position: "top",
    section: "Resume",
  },
  {
    selector: "#generate-resume-button",
    title: "Generate your resume",
    description:
      "Create a tailored draft from your target role, selected skills, and saved projects. Your new resume is saved in Recent resumes on the homepage.",
    position: "top",
    section: "Resume",
  },
];

type WalkthroughProps = {
  open: boolean;
  onClose: () => void;
  onSectionChange: (section: Section) => void;
};

type TooltipLayout = {
  left: number;
  top: number;
};

const GAP = 14;
const VIEWPORT_PADDING = 16;

function getTooltipLayout(
  target: DOMRect,
  tooltip: DOMRect,
  preferred: TooltipPosition,
): TooltipLayout {
  const positions: TooltipPosition[] = [
    preferred,
    "bottom",
    "top",
    "right",
    "left",
  ].filter((position, index, list) => list.indexOf(position) === index);

  for (const position of positions) {
    let left = target.left + (target.width - tooltip.width) / 2;
    let top = target.bottom + GAP;

    if (position === "top") top = target.top - tooltip.height - GAP;
    if (position === "left") {
      left = target.left - tooltip.width - GAP;
      top = target.top + (target.height - tooltip.height) / 2;
    }
    if (position === "right") {
      left = target.right + GAP;
      top = target.top + (target.height - tooltip.height) / 2;
    }
    if (position === "bottom") top = target.bottom + GAP;

    const fitsHorizontally =
      left >= VIEWPORT_PADDING &&
      left + tooltip.width <= window.innerWidth - VIEWPORT_PADDING;
    const fitsVertically =
      top >= VIEWPORT_PADDING &&
      top + tooltip.height <= window.innerHeight - VIEWPORT_PADDING;
    if (fitsHorizontally && fitsVertically) return { left, top };
  }

  return {
    left: Math.max(
      VIEWPORT_PADDING,
      Math.min(
        target.left + (target.width - tooltip.width) / 2,
        window.innerWidth - tooltip.width - VIEWPORT_PADDING,
      ),
    ),
    top: Math.max(
      VIEWPORT_PADDING,
      Math.min(
        target.bottom + GAP,
        window.innerHeight - tooltip.height - VIEWPORT_PADDING,
      ),
    ),
  };
}

export default function Walkthrough({
  open,
  onClose,
  onSectionChange,
}: WalkthroughProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipLayout, setTooltipLayout] = useState<TooltipLayout | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const step = walkthroughSteps[stepIndex];

  const finish = () => {
    window.localStorage.setItem("hasSeenWalkthrough", "true");
    window.scrollTo({ top: 0, behavior: "smooth" });
    onClose();
  };

  const goToStep = (nextIndex: number) => {
    if (nextIndex >= walkthroughSteps.length) {
      finish();
      return;
    }
    const nextStep = walkthroughSteps[Math.max(0, nextIndex)];
    onSectionChange(nextStep.section);
    setStepIndex(Math.max(0, nextIndex));
  };

  useEffect(() => {
    if (!open) return;

    onSectionChange(step.section);
    setTargetRect(null);
    setTooltipLayout(null);

    const target = document.querySelector<HTMLElement>(step.selector);
    if (!target) {
      goToStep(stepIndex + 1);
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    let animationFrame = window.requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        goToStep(stepIndex + 1);
        return;
      }
      setTargetRect(rect);
      animationFrame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    });

    const updateLayout = () => {
      const currentTarget = document.querySelector<HTMLElement>(step.selector);
      const dialog = dialogRef.current;
      if (!currentTarget || !dialog) return;
      const rect = currentTarget.getBoundingClientRect();
      setTargetRect(rect);
      setTooltipLayout(getTooltipLayout(rect, dialog.getBoundingClientRect(), step.position));
    };

    const layoutFrame = window.requestAnimationFrame(updateLayout);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(layoutFrame);
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
    };
  }, [open, stepIndex, step, onSectionChange]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToStep(stepIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToStep(Math.max(0, stepIndex - 1));
      } else if (
        event.key === "Enter" &&
        !["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(
          (event.target as HTMLElement).tagName,
        )
      ) {
        event.preventDefault();
        goToStep(stepIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, stepIndex, onClose, onSectionChange]);

  useEffect(() => {
    if (!open) setStepIndex(0);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="walkthrough-layer">
      {targetRect && (
        <svg
          aria-hidden="true"
          className="walkthrough-shade"
          viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            <mask id="walkthrough-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 7}
                y={targetRect.top - 7}
                width={targetRect.width + 14}
                height={targetRect.height + 14}
                rx="16"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgb(3 23 17 / 68%)"
            mask="url(#walkthrough-spotlight-mask)"
          />
        </svg>
      )}
      <div
        aria-describedby="walkthrough-description"
        aria-labelledby="walkthrough-title"
        aria-modal="true"
        className="walkthrough-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        style={
          tooltipLayout
            ? {
                left: tooltipLayout.left,
                top: tooltipLayout.top,
                transform: "none",
              }
            : undefined
        }
      >
        <div className="walkthrough-progress">
          <span>YOUR RESUMEGPT TOUR</span>
          <span>{stepIndex + 1} of {walkthroughSteps.length}</span>
        </div>
        <div className="walkthrough-content">
          <p className="walkthrough-kicker">STEP {String(stepIndex + 1).padStart(2, "0")}</p>
          <h2 id="walkthrough-title">{step.title}</h2>
          <p id="walkthrough-description">{step.description}</p>
        </div>
        <div className="walkthrough-actions">
          <button className="walkthrough-skip" onClick={finish} type="button">
            Skip tour
          </button>
          <div className="walkthrough-nav">
            <button
              aria-label="Previous step"
              className="walkthrough-back"
              disabled={stepIndex === 0}
              onClick={() => goToStep(stepIndex - 1)}
              type="button"
            >
              Back
            </button>
            <button
              className="walkthrough-next"
              onClick={() => goToStep(stepIndex + 1)}
              type="button"
            >
              {stepIndex === walkthroughSteps.length - 1 ? "Done" : "Next"}
              {stepIndex < walkthroughSteps.length - 1 && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
