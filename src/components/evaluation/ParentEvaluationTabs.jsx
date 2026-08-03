"use client";

import { useState } from "react";
import { EvaluationFormPanel } from "@/components/evaluation/EvaluationFormPanel";
import { EvaluationProgressCard } from "@/components/evaluation/EvaluationProgressCard";
import { cn } from "@/lib/utils";

export function ParentEvaluationTabs({
  schoolYear,
  defaultTerm,
  children,
  systemExisting,
  childExistings = {},
  progress,
}) {
  const [tab, setTab] = useState(progress?.systemDone ? "child" : "system");
  const [childId, setChildId] = useState(() => children[0]?.id || "");

  const tabs = [
    { key: "system", label: "System", hint: "Parent portal" },
    { key: "child", label: "My child", hint: "Per linked learner" },
  ];

  const progressItems = [
    { key: "system", label: "System / portal evaluation", done: progress?.systemDone },
    ...(progress?.children || []).map((c) => ({
      key: c.id,
      label: c.name || c.lrn || "Learner",
      done: c.done,
    })),
  ];

  const orderedChildren = (() => {
    if (!childId || !children.length) return children;
    const selected = children.find((c) => c.id === childId);
    if (!selected) return children;
    return [selected, ...children.filter((c) => c.id !== childId)];
  })();

  return (
    <div className="space-y-4">
      <EvaluationProgressCard
        title={`Term ${defaultTerm} evaluation progress`}
        complete={Boolean(progress?.complete)}
        totalCompleted={progress?.totalCompleted || 0}
        totalRequired={progress?.totalRequired || 1}
        items={progressItems}
        lockedMessage="Evaluate the portal and each linked child for this term."
      />

      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-[#800000]/10 bg-white p-1.5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              data-active={active ? "true" : undefined}
              className={cn(
                "portal-soft-tab flex w-full min-w-0 flex-col items-center px-2 py-2.5 text-sm sm:flex-row sm:justify-center sm:gap-1.5",
                active && "is-active"
              )}
            >
              <span className="truncate">{item.label}</span>
              <span className="hidden text-[11px] font-normal opacity-75 sm:inline">
                · {item.hint}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "system" ? (
        <EvaluationFormPanel
          role="parent"
          evaluationType="system"
          schoolYear={schoolYear}
          defaultTerm={defaultTerm}
          existing={systemExisting}
          title="Evaluate the parent portal"
          description="How PastraPortal helps you stay informed overall."
        />
      ) : children.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-5 py-10 text-center text-sm text-muted-foreground shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          No linked children yet. Complete the system evaluation after a learner is
          linked to your Parent Access Code.
        </div>
      ) : (
        <EvaluationFormPanel
          key={`child-${childId}-${defaultTerm}`}
          role="parent"
          evaluationType="child"
          schoolYear={schoolYear}
          defaultTerm={defaultTerm}
          children={orderedChildren}
          existing={childExistings[childId] || null}
          title="Evaluate monitoring for your child"
          description="Rate how the portal helps you follow this child’s progress and attendance."
          onChildChange={setChildId}
        />
      )}
    </div>
  );
}
