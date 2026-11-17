import React, { useState } from 'react';

interface EksSvgFallbackProps {
  onSelectTarget?: (sectionId: string) => void;
  reducedMotionNote?: boolean;
}

const CALLOUTS = [
  { id: 'alb', label: 'ALB Ingress Hub (HTTPS/443)', target: 'projects', x: 110, y: 185 },
  { id: 'az-a', label: 'AZ1: us-east-1a · Worker Node Group', target: 'skills', x: 310, y: 105 },
  { id: 'az-b', label: 'AZ2: us-east-1b · Pod Replicas', target: 'skills', x: 310, y: 195 },
  { id: 'az-c', label: 'AZ3: us-east-1c · Karpenter Pool', target: 'projects', x: 310, y: 285 },
];

export function EksSvgFallback({ onSelectTarget, reducedMotionNote }: EksSvgFallbackProps) {
  const [activeLabel, setActiveLabel] = useState<string>('Hover or click any cluster node to inspect');

  return (
    <div className="relative flex h-full w-full flex-col justify-between border border-[var(--bp-line)] bg-[var(--bp-surface)] p-4">
      <div className="flex items-center justify-between font-mono text-[11px] text-[var(--bp-ink-muted)]">
        <span>FIG 01 · AMAZON EKS MULTI-AZ TOPOLOGY</span>
        <span>{reducedMotionNote ? 'STATIC SCHEMATIC MODE' : 'SVG BLUEPRINT'}</span>
      </div>

      <svg
        viewBox="0 0 600 360"
        className="my-2 h-auto w-full"
        role="img"
        aria-label="Architectural blueprint diagram of an AWS EKS cluster with one VPC, an Application Load Balancer, and three availability zone subnets us-east-1a, us-east-1b, and us-east-1c"
      >
        {/* VPC Boundary */}
        <rect
          x="190"
          y="24"
          width="390"
          height="312"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeDasharray="6 4"
          strokeWidth="1.5"
        />
        <text x="202" y="42" fill="currentColor" fontSize="11" fontFamily="JetBrains Mono, monospace">
          VPC: 10.0.0.0/16 (Amazon EKS Control &amp; Data Plane)
        </text>

        {/* Subnets */}
        {[
          { y: 58, az: 'us-east-1a · 10.0.1.0/24', target: 'skills', nodeLabel: 'Node group: my-worker-node-1a' },
          { y: 150, az: 'us-east-1b · 10.0.2.0/24', target: 'skills', nodeLabel: 'Node group: my-worker-node-1b' },
          { y: 242, az: 'us-east-1c · 10.0.3.0/24', target: 'projects', nodeLabel: 'Node group: my-worker-node-1c' },
        ].map((sub, idx) => (
          <g
            key={sub.az}
            className="cursor-pointer"
            tabIndex={0}
            role="button"
            aria-label={`${sub.az} — ${sub.nodeLabel}`}
            onMouseEnter={() => setActiveLabel(`${sub.az} · ${sub.nodeLabel}`)}
            onFocus={() => setActiveLabel(`${sub.az} · ${sub.nodeLabel}`)}
            onClick={() => onSelectTarget?.(sub.target)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectTarget?.(sub.target);
              }
            }}
          >
            <rect
              x="210"
              y={sub.y}
              width="350"
              height="76"
              fill="currentColor"
              fillOpacity="0.04"
              stroke="currentColor"
              strokeOpacity="0.5"
              strokeWidth="1.2"
            />
            <text x="222" y={sub.y + 18} fill="currentColor" fontSize="10" fontFamily="JetBrains Mono, monospace">
              {sub.az}
            </text>

            {/* Worker Node Cubes */}
            {[240, 390].map((nx, nIdx) => (
              <g key={`${idx}-${nIdx}`}>
                <rect
                  x={nx}
                  y={sub.y + 26}
                  width="120"
                  height="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                {/* Pods inside worker node */}
                {[0, 1, 2].map((pIdx) => (
                  <rect
                    key={pIdx}
                    x={nx + 12 + pIdx * 34}
                    y={sub.y + 36}
                    width="22"
                    height="20"
                    fill="var(--bp-accent)"
                    fillOpacity="0.22"
                    stroke="var(--bp-accent)"
                    strokeWidth="1"
                  />
                ))}
              </g>
            ))}

            {/* Routing line from ALB */}
            <path
              d={`M 136 188 C 175 188, 175 ${sub.y + 44}, 238 ${sub.y + 44}`}
              fill="none"
              stroke="var(--bp-accent)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          </g>
        ))}

        {/* ALB Hub */}
        <g
          className="cursor-pointer"
          tabIndex={0}
          role="button"
          aria-label="Application Load Balancer Hub"
          onMouseEnter={() => setActiveLabel('Application Load Balancer · TLS 1.3 Ingress')}
          onFocus={() => setActiveLabel('Application Load Balancer · TLS 1.3 Ingress')}
          onClick={() => onSelectTarget?.('projects')}
        >
          <rect
            x="24"
            y="148"
            width="112"
            height="80"
            fill="var(--bp-accent)"
            fillOpacity="0.12"
            stroke="var(--bp-accent)"
            strokeWidth="1.6"
          />
          <text x="38" y="182" fill="currentColor" fontSize="11" fontWeight="600" fontFamily="JetBrains Mono, monospace">
            AWS ALB
          </text>
          <text x="38" y="198" fill="currentColor" opacity="0.8" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
            Ingress Hub
          </text>
        </g>
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--bp-line)] pt-2 font-mono text-xs text-[var(--bp-ink-muted)]">
        <span>{activeLabel}</span>
        <div className="flex gap-3">
          {CALLOUTS.slice(0, 2).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectTarget?.(c.target)}
              className="underline decoration-[var(--bp-line-strong)] underline-offset-4 hover:text-[var(--bp-accent)]"
            >
              {c.id.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
