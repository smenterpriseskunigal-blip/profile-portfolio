import PDFDocument from 'pdfkit';
import type { PortfolioBundle } from '../../types/portfolio.ts';

export interface GeneratedPdfResult {
  buffer: Buffer;
  pageCount: number;
  filename: string;
}

export async function generateAtsResumePdf(bundle: PortfolioBundle): Promise<GeneratedPdfResult> {
  const { profile } = bundle;
  const paperSize = profile.resumeConfig?.paperSize === 'A4' ? 'A4' : 'LETTER';

  return new Promise<GeneratedPdfResult>((resolve, reject) => {
    const doc = new PDFDocument({
      size: paperSize,
      margins: { top: 54, bottom: 54, left: 54, right: 54 }, // 0.75 inch margins
      lang: 'en-US',
      info: {
        Title: `${profile.name} – Resume`,
        Author: profile.name,
        Subject: `${profile.role} – ATS-Optimised Resume`,
        Keywords: bundle.skills
          .filter((s) => s.visible && !s.deletedAt)
          .map((s) => s.name)
          .join(', '),
      },
      autoFirstPage: true,
    });

    const chunks: Buffer[] = [];
    let pageCount = 1;

    doc.on('pageAdded', () => {
      pageCount += 1;
    });
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      resolve({
        buffer: Buffer.concat(chunks),
        pageCount,
        filename: 'Yashwanth_Gowda_M_Resume.pdf',
      });
    });
    doc.on('error', reject);

    const contentWidth = doc.page.width - 108;
    const black = '#111111';
    const muted = '#333333';

    const drawSectionHeading = (title: string) => {
      if (doc.y > doc.page.height - 110) {
        doc.addPage();
      }
      doc.moveDown(0.55);
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(black)
        .text(title, { align: 'left' });
      const ruleY = doc.y + 1;
      doc
        .moveTo(54, ruleY)
        .lineTo(54 + contentWidth, ruleY)
        .lineWidth(0.6)
        .strokeColor('#444444')
        .stroke();
      doc.moveDown(0.35);
    };

    // Header (Plain text in body, single column, zero graphics/tables)
    doc.font('Helvetica-Bold').fontSize(16).fillColor(black).text(profile.name);
    doc.font('Helvetica').fontSize(11).fillColor(muted).text(profile.role);

    const contactLine1 = [profile.location, profile.phone, profile.email].filter(Boolean).join('  |  ');
    const contactLine2 = [profile.linkedinUrl, profile.githubUrl, profile.websiteUrl]
      .filter(Boolean)
      .join('  |  ');

    if (contactLine1) {
      doc.font('Helvetica').fontSize(10).fillColor(black).text(contactLine1);
    }
    if (contactLine2) {
      doc.font('Helvetica').fontSize(10).fillColor(black).text(contactLine2);
    }

    // SUMMARY
    drawSectionHeading('SUMMARY');
    doc.font('Helvetica').fontSize(10.5).fillColor(black).text(profile.summary, {
      lineGap: 2,
    });

    // SKILLS
    const visibleSkills = bundle.skills
      .filter((s) => s.visible && !s.deletedAt)
      .sort((a, b) => a.order - b.order);

    if (visibleSkills.length > 0) {
      drawSectionHeading('SKILLS');
      const grouped = new Map<string, string[]>();
      for (const sk of visibleSkills) {
        const list = grouped.get(sk.category) ?? [];
        list.push(sk.name);
        grouped.set(sk.category, list);
      }
      for (const [category, items] of grouped.entries()) {
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(black).text(`${category}: `, {
          continued: true,
        });
        doc.font('Helvetica').fontSize(10.5).fillColor(black).text(items.join(', '), {
          lineGap: 1.5,
        });
      }
    }

    // WORK EXPERIENCE
    const visibleExp = bundle.experiences
      .filter((e) => e.visible && !e.deletedAt)
      .sort((a, b) => a.order - b.order);

    if (visibleExp.length > 0) {
      drawSectionHeading('WORK EXPERIENCE');
      for (const exp of visibleExp) {
        if (doc.y > doc.page.height - 120) doc.addPage();
        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor(black)
          .text(`${exp.role} — ${exp.company}`, { continued: true });
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(muted)
          .text(`  (${exp.location})  |  ${exp.startDate} – ${exp.endDate}`);

        for (const bullet of exp.bullets) {
          doc.font('Helvetica').fontSize(10).fillColor(black).text(`- ${bullet}`, {
            indent: 12,
            lineGap: 1.5,
          });
        }
        if (exp.techStack.length > 0) {
          doc
            .font('Helvetica-Oblique')
            .fontSize(9.5)
            .fillColor(muted)
            .text(`Technologies: ${exp.techStack.join(', ')}`, { indent: 12 });
        }
        doc.moveDown(0.35);
      }
    }

    // PROJECTS
    const visibleProjects = bundle.projects
      .filter((p) => p.visible && !p.deletedAt)
      .sort((a, b) => a.order - b.order);

    if (visibleProjects.length > 0) {
      drawSectionHeading('PROJECTS');
      for (const proj of visibleProjects) {
        if (doc.y > doc.page.height - 110) doc.addPage();
        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor(black)
          .text(`${proj.title} — ${proj.role}`);
        doc.font('Helvetica').fontSize(10).fillColor(black).text(proj.summary, {
          lineGap: 1.5,
        });
        for (const outcome of proj.outcomes) {
          doc.font('Helvetica').fontSize(10).fillColor(black).text(`- ${outcome}`, {
            indent: 12,
            lineGap: 1.5,
          });
        }
        const metaParts = [
          proj.techTags.length ? `Stack: ${proj.techTags.join(', ')}` : '',
          proj.githubUrl || '',
          proj.liveUrl || '',
        ].filter(Boolean);
        if (metaParts.length > 0) {
          doc.font('Helvetica').fontSize(9.5).fillColor(muted).text(metaParts.join('  |  '), {
            indent: 12,
          });
        }
        doc.moveDown(0.35);
      }
    }

    // EDUCATION
    const visibleEdu = bundle.education
      .filter((e) => e.visible && !e.deletedAt)
      .sort((a, b) => a.order - b.order);

    if (visibleEdu.length > 0) {
      drawSectionHeading('EDUCATION');
      for (const edu of visibleEdu) {
        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor(black)
          .text(edu.degree, { continued: true });
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(black)
          .text(` — ${edu.institution} (${edu.years})${edu.score ? `  |  ${edu.score}` : ''}`);
      }
    }

    // CERTIFICATIONS
    const visibleCerts = bundle.certifications
      .filter((c) => c.visible && !c.deletedAt)
      .sort((a, b) => a.order - b.order);

    if (visibleCerts.length > 0) {
      drawSectionHeading('CERTIFICATIONS');
      for (const cert of visibleCerts) {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(black)
          .text(
            `- ${cert.name} — ${cert.issuer} (${cert.date})${cert.credentialId ? `  |  ID: ${cert.credentialId}` : ''}`
          );
      }
    }

    // ACHIEVEMENTS
    const visibleAch = bundle.achievements
      .filter((a) => a.visible && !a.deletedAt)
      .sort((a, b) => a.order - b.order);

    if (profile.resumeConfig?.includeAchievements && visibleAch.length > 0) {
      drawSectionHeading('ACHIEVEMENTS');
      for (const ach of visibleAch) {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(black)
          .text(
            `- ${ach.title} (${ach.date})${ach.metric ? ` — ${ach.metric}` : ''}: ${ach.description}`
          );
      }
    }

    // VOLUNTEERING
    const visibleVol = bundle.volunteering
      .filter((v) => v.visible && !v.deletedAt)
      .sort((a, b) => a.order - b.order);

    if (profile.resumeConfig?.includeVolunteering && visibleVol.length > 0) {
      drawSectionHeading('VOLUNTEERING');
      for (const vol of visibleVol) {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(black)
          .text(`${vol.role} — ${vol.organisation}`, { continued: true });
        doc.font('Helvetica').fontSize(10).fillColor(muted).text(` (${vol.dates})`);
        if (vol.impact) {
          doc.font('Helvetica').fontSize(10).fillColor(black).text(`- ${vol.impact}`, {
            indent: 12,
          });
        }
      }
    }

    doc.end();
  });
}
