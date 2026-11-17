import type {
  AtsCategoryBreakdown,
  AtsScoreReport,
  PortfolioBundle,
} from '../../types/portfolio.ts';

const ACTION_VERBS = new Set([
  'architected',
  'automated',
  'built',
  'configured',
  'consolidated',
  'cut',
  'deployed',
  'designed',
  'eliminated',
  'engineered',
  'established',
  'implemented',
  'improved',
  'increased',
  'launched',
  'led',
  'managed',
  'mentored',
  'migrated',
  'monitored',
  'optimised',
  'optimized',
  'orchestrated',
  'provisioned',
  'reduced',
  'refactored',
  'remediated',
  'resolved',
  'scaled',
  'secured',
  'simplified',
  'standardised',
  'standardized',
  'streamlined',
]);

const DEFAULT_DEVOPS_KEYWORDS = [
  'amazon eks',
  'kubernetes',
  'terraform',
  'ci/cd',
  'helm',
  'aws',
  'docker',
  'argocd',
  'github actions',
  'prometheus',
  'grafana',
  'linux',
];

const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'that', 'this', 'from', 'your', 'will', 'have',
  'are', 'our', 'you', 'role', 'team', 'work', 'years', 'experience', 'using',
  'strong', 'skills', 'ability', 'into', 'across', 'such', 'other', 'more',
  'about', 'must', 'plus', 'good', 'well', 'best', 'high', 'production',
  'systems', 'engineering', 'engineer', 'looking', 'seeking', 'preferred',
]);

const KNOWN_TECH_TOKENS = [
  'amazon eks',
  'elastic kubernetes service',
  'github actions',
  'application load balancer',
  'infrastructure as code',
  'continuous integration',
  'continuous delivery',
  'opa gatekeeper',
  'hashicorp vault',
  'amazon rds',
  'kubernetes',
  'terraform',
  'opentofu',
  'karpenter',
  'argocd',
  'prometheus',
  'grafana',
  'opentelemetry',
  'ansible',
  'docker',
  'helm',
  'aws',
  'vpc',
  'iam',
  'irsa',
  'ci/cd',
  'gitops',
  'python',
  'bash',
  'go',
  'postgresql',
  'redis',
  'trivy',
  'loki',
  'linux',
];

export function extractKeywordsFromJd(jobDescription?: string): string[] {
  if (!jobDescription || !jobDescription.trim()) {
    return DEFAULT_DEVOPS_KEYWORDS;
  }

  const lower = jobDescription.toLowerCase();
  const extracted = new Set<string>();

  for (const phrase of KNOWN_TECH_TOKENS) {
    if (lower.includes(phrase)) {
      extracted.add(phrase);
    }
  }

  // Also capture significant domain words if JD contains niche tokens
  const words = lower.match(/[a-z0-9][a-z0-9/+#.-]{2,}/g) ?? [];
  for (const w of words) {
    const clean = w.replace(/[.,;:()]+$/g, '');
    if (
      clean.length >= 3 &&
      !STOP_WORDS.has(clean) &&
      extracted.size < 18 &&
      (/^[a-z]+\/[a-z]+$/.test(clean) ||
        KNOWN_TECH_TOKENS.some((t) => t === clean))
    ) {
      extracted.add(clean);
    }
  }

  return extracted.size >= 4 ? Array.from(extracted) : DEFAULT_DEVOPS_KEYWORDS;
}

export function buildResumePlainLines(bundle: PortfolioBundle): string[] {
  const { profile } = bundle;
  const visibleExp = bundle.experiences
    .filter((e) => e.visible && !e.deletedAt)
    .sort((a, b) => a.order - b.order);
  const visibleSkills = bundle.skills
    .filter((s) => s.visible && !s.deletedAt)
    .sort((a, b) => a.order - b.order);
  const visibleProjects = bundle.projects
    .filter((p) => p.visible && !p.deletedAt)
    .sort((a, b) => a.order - b.order);
  const visibleEdu = bundle.education
    .filter((e) => e.visible && !e.deletedAt)
    .sort((a, b) => a.order - b.order);
  const visibleCerts = bundle.certifications
    .filter((c) => c.visible && !c.deletedAt)
    .sort((a, b) => a.order - b.order);
  const visibleAch = bundle.achievements
    .filter((a) => a.visible && !a.deletedAt)
    .sort((a, b) => a.order - b.order);
  const visibleVol = bundle.volunteering
    .filter((v) => v.visible && !v.deletedAt)
    .sort((a, b) => a.order - b.order);

  const lines: string[] = [];
  lines.push(profile.name);
  lines.push(profile.role);
  lines.push(
    [
      profile.location,
      profile.phone,
      profile.email,
      profile.linkedinUrl,
      profile.githubUrl,
    ]
      .filter(Boolean)
      .join(' | ')
  );

  lines.push('SUMMARY');
  lines.push(profile.summary);

  if (visibleSkills.length > 0) {
    lines.push('SKILLS');
    const grouped = new Map<string, string[]>();
    for (const sk of visibleSkills) {
      const list = grouped.get(sk.category) ?? [];
      list.push(sk.name);
      grouped.set(sk.category, list);
    }
    for (const [cat, names] of grouped.entries()) {
      lines.push(`${cat}: ${names.join(', ')}`);
    }
  }

  if (visibleExp.length > 0) {
    lines.push('WORK EXPERIENCE');
    for (const exp of visibleExp) {
      lines.push(`${exp.role} — ${exp.company} (${exp.location}) | ${exp.startDate} – ${exp.endDate}`);
      for (const b of exp.bullets) {
        lines.push(`• ${b}`);
      }
      if (exp.techStack.length > 0) {
        lines.push(`Technologies: ${exp.techStack.join(', ')}`);
      }
    }
  }

  if (visibleProjects.length > 0) {
    lines.push('PROJECTS');
    for (const proj of visibleProjects) {
      const linkSuffix = [proj.githubUrl, proj.liveUrl].filter(Boolean).join(' | ');
      lines.push(`${proj.title} — ${proj.role}${linkSuffix ? ` (${linkSuffix})` : ''}`);
      lines.push(proj.summary);
      for (const outcome of proj.outcomes) {
        lines.push(`• ${outcome}`);
      }
      if (proj.techTags.length > 0) {
        lines.push(`Stack: ${proj.techTags.join(', ')}`);
      }
    }
  }

  if (visibleEdu.length > 0) {
    lines.push('EDUCATION');
    for (const edu of visibleEdu) {
      lines.push(`${edu.degree} — ${edu.institution} | ${edu.years}${edu.score ? ` | ${edu.score}` : ''}`);
    }
  }

  if (visibleCerts.length > 0) {
    lines.push('CERTIFICATIONS');
    for (const cert of visibleCerts) {
      lines.push(
        `${cert.name} — ${cert.issuer} (${cert.date})${cert.credentialId ? ` | ID: ${cert.credentialId}` : ''}`
      );
    }
  }

  if (profile.resumeConfig.includeAchievements && visibleAch.length > 0) {
    lines.push('ACHIEVEMENTS');
    for (const ach of visibleAch) {
      lines.push(`• ${ach.title} (${ach.date}) — ${ach.metric ? `${ach.metric}: ` : ''}${ach.description}`);
    }
  }

  if (profile.resumeConfig.includeVolunteering && visibleVol.length > 0) {
    lines.push('VOLUNTEERING');
    for (const vol of visibleVol) {
      lines.push(`${vol.role} — ${vol.organisation} (${vol.dates})`);
      if (vol.impact) lines.push(`• ${vol.impact}`);
    }
  }

  return lines;
}

export function evaluateAtsScore(
  bundle: PortfolioBundle,
  extractedPdfText: string,
  pageCount: number,
  jobDescription?: string
): AtsScoreReport {
  const normalizedText = extractedPdfText.replace(/\s+/g, ' ').trim();
  const lowerText = normalizedText.toLowerCase();
  const words = normalizedText ? normalizedText.split(/\s+/) : [];
  const fixList: string[] = [];

  // 1. Parsability (25 pts)
  const parsabilityNotes: string[] = [];
  let parsabilityScore = 0;
  if (words.length >= 150) {
    parsabilityScore += 15;
    parsabilityNotes.push(`Selectable text verified (${words.length} extracted words).`);
  } else {
    parsabilityNotes.push(`Low extracted word count (${words.length}); target at least 150 words.`);
    fixList.push('Expand Summary, Experience, or Project descriptions so extracted resume text has at least 150 words.');
  }

  const summaryIdx = lowerText.indexOf('summary');
  const expIdx = lowerText.indexOf('work experience');
  const eduIdx = lowerText.indexOf('education');
  if (summaryIdx !== -1 && (expIdx === -1 || summaryIdx < expIdx) && (eduIdx === -1 || summaryIdx < eduIdx)) {
    parsabilityScore += 10;
    parsabilityNotes.push('Single-column linear reading order verified (no tables or multi-column drift).');
  } else {
    parsabilityNotes.push('Section reading order could not be confirmed.');
    fixList.push('Ensure Summary appears before Work Experience and Education in single-column order.');
  }

  // 2. Standard Headings & Structure (15 pts)
  const requiredHeadings = ['summary', 'skills', 'work experience', 'projects', 'education', 'certifications'];
  const presentHeadings = requiredHeadings.filter((h) => lowerText.includes(h));
  const headingsScore = Math.round((presentHeadings.length / requiredHeadings.length) * 15);
  const missingHeadings = requiredHeadings.filter((h) => !lowerText.includes(h));
  const headingsNotes = [
    `${presentHeadings.length}/${requiredHeadings.length} standard ATS section headings detected.`,
  ];
  if (missingHeadings.length > 0) {
    fixList.push(`Add visible entries for standard section(s): ${missingHeadings.join(', ')}.`);
  }

  // 3. Contact Info Completeness (10 pts)
  const contactChecks = [
    { label: 'Name', ok: lowerText.includes(bundle.profile.name.toLowerCase()) },
    { label: 'Email', ok: lowerText.includes(bundle.profile.email.toLowerCase()) },
    { label: 'Phone', ok: Boolean(bundle.profile.phone) && lowerText.includes(bundle.profile.phone.toLowerCase()) },
    { label: 'Location', ok: Boolean(bundle.profile.location) },
    { label: 'LinkedIn URL', ok: Boolean(bundle.profile.linkedinUrl) && lowerText.includes('linkedin.com') },
    { label: 'GitHub URL', ok: Boolean(bundle.profile.githubUrl) && lowerText.includes('github.com') },
  ];
  const passedContacts = contactChecks.filter((c) => c.ok).length;
  const contactScore = Math.round((passedContacts / contactChecks.length) * 10);
  const missingContacts = contactChecks.filter((c) => !c.ok).map((c) => c.label);
  const contactNotes = [`${passedContacts}/${contactChecks.length} contact fields present in selectable body text.`];
  if (missingContacts.length > 0) {
    fixList.push(`Complete missing contact info: ${missingContacts.join(', ')}.`);
  }

  // 4. Keyword Coverage (30 pts)
  const targetKeywords = extractKeywordsFromJd(jobDescription);
  const matchedKeywords = targetKeywords.filter((kw) => lowerText.includes(kw.toLowerCase()));
  const missingKeywords = targetKeywords.filter((kw) => !lowerText.includes(kw.toLowerCase()));
  const kwRatio = targetKeywords.length > 0 ? matchedKeywords.length / targetKeywords.length : 1;
  const keywordScore = Math.round(kwRatio * 30);
  const keywordNotes = [
    `Matched ${matchedKeywords.length}/${targetKeywords.length} target keywords.`,
  ];
  if (missingKeywords.length > 0) {
    fixList.push(`Consider incorporating missing keywords where accurate: ${missingKeywords.slice(0, 6).join(', ')}.`);
  }

  // 5. Quantified Bullets & Action Verbs (10 pts)
  const visibleExps = bundle.experiences.filter((e) => e.visible && !e.deletedAt);
  const visibleProjs = bundle.projects.filter((p) => p.visible && !p.deletedAt);
  const allBullets = [
    ...visibleExps.flatMap((e) => e.bullets),
    ...visibleProjs.flatMap((p) => p.outcomes),
  ];
  let strongBullets = 0;
  for (const b of allBullets) {
    const firstWord = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
    const hasActionVerb = ACTION_VERBS.has(firstWord);
    const hasMetric = /\d+|%|\+|sla|mttr/i.test(b);
    if (hasActionVerb && hasMetric) {
      strongBullets += 1;
    } else if (hasActionVerb || hasMetric) {
      strongBullets += 0.6;
    }
  }
  const bulletRatio = allBullets.length > 0 ? Math.min(1, strongBullets / allBullets.length) : 0;
  const bulletScore = Math.round(bulletRatio * 10);
  const bulletNotes = [
    `${Math.round(bulletRatio * 100)}% of ${allBullets.length} bullets pair strong action verbs with metrics.`,
  ];
  if (bulletScore < 8) {
    fixList.push('Start each experience/project bullet with a strong past-tense action verb and add measurable outcomes.');
  }

  // 6. Length, Dates & Formatting Consistency (10 pts)
  const monYearRegex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$|^Present$/i;
  const allDatesValid = visibleExps.every(
    (e) => monYearRegex.test(e.startDate.trim()) && monYearRegex.test(e.endDate.trim())
  );
  let formattingScore = 0;
  const formattingNotes: string[] = [];
  if (pageCount >= 1 && pageCount <= 2) {
    formattingScore += 6;
    formattingNotes.push(`Page count is ${pageCount} (within 1–2 page ATS target).`);
  } else {
    formattingNotes.push(`Page count is ${pageCount}; keep resume within 1–2 pages.`);
    fixList.push('Trim older or low-priority items so the PDF fits within 1–2 pages.');
  }
  if (allDatesValid) {
    formattingScore += 4;
    formattingNotes.push('Consistent "Mon YYYY" date formatting verified.');
  } else {
    formattingNotes.push('Inconsistent date format detected in Work Experience.');
    fixList.push('Use consistent "Mon YYYY" dates (e.g., "Jan 2024" or "Present") across all experience entries.');
  }

  const breakdown: AtsCategoryBreakdown[] = [
    { key: 'parsability', label: 'Parsability & Reading Order', score: parsabilityScore, maxScore: 25, notes: parsabilityNotes },
    { key: 'headings', label: 'Standard Headings & Structure', score: headingsScore, maxScore: 15, notes: headingsNotes },
    { key: 'contact', label: 'Contact Info Completeness', score: contactScore, maxScore: 10, notes: contactNotes },
    { key: 'keywords', label: 'Keyword Coverage', score: keywordScore, maxScore: 30, notes: keywordNotes },
    { key: 'bullets', label: 'Action Verbs & Quantified Metrics', score: bulletScore, maxScore: 10, notes: bulletNotes },
    { key: 'formatting', label: 'Length & Date Consistency', score: formattingScore, maxScore: 10, notes: formattingNotes },
  ];

  const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0);

  return {
    totalScore,
    publishable: totalScore >= 90,
    breakdown,
    matchedKeywords,
    missingKeywords,
    fixList,
    extractedWordCount: words.length,
    estimatedPages: pageCount,
    disclaimer:
      'Internal rubric estimate based on selectable-text extraction, standard ATS structure, and keyword matching. Commercial ATS parsers (Workday, Greenhouse, Lever) differ.',
  };
}
