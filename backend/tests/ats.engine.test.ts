import { describe, it, expect } from 'vitest';
import {
  evaluateAtsMatch,
  matchKeywordInText,
  matchKeywords,
  matchSkills,
  matchExperience,
  matchEducation,
  StructuredCV,
  DEFAULT_SCORE_WEIGHTS,
} from '../src/services/ats/index.js';
import { JobRequirements } from '../src/services/jobs/types.js';

describe('Deterministic ATS Matching Engine', () => {
  const sampleJd: JobRequirements = {
    jobTitle: 'Senior Full Stack Engineer',
    requiredSkills: [
      { name: 'JavaScript', importance: 'REQUIRED', evidence: 'Core JavaScript knowledge' },
      { name: 'React', importance: 'REQUIRED', evidence: 'Expert React developer' },
    ],
    preferredSkills: [
      { name: 'GraphQL', importance: 'PREFERRED', evidence: 'GraphQL is a plus' },
    ],
    requiredTechnologies: [
      { name: 'Node.js', importance: 'REQUIRED', evidence: 'Node.js backend microservices' },
      { name: 'PostgreSQL', importance: 'REQUIRED', evidence: 'PostgreSQL database' },
    ],
    preferredTechnologies: [
      { name: 'Kubernetes', importance: 'PREFERRED', evidence: 'Kubernetes deployment preferred' },
    ],
    requiredExperience: [
      { name: '3+ years experience', importance: 'REQUIRED', evidence: '3+ years of experience required' },
    ],
    educationRequirements: [
      { name: "Bachelor's degree in Computer Science", importance: 'REQUIRED', evidence: 'BS in Computer Science' },
    ],
    certifications: [
      { name: 'AWS Certified', importance: 'REQUIRED', evidence: 'AWS Certified Developer' },
    ],
    languages: [],
    responsibilities: [],
    softSkills: [],
    importantKeywords: [
      { name: 'Microservices', importance: 'REQUIRED', evidence: 'microservices architecture' },
    ],
  };

  describe('Keyword & Alias Matching', () => {
    it('matches technology aliases accurately', () => {
      // JS -> JavaScript
      expect(matchKeywordInText('JavaScript', 'Skilled in JS and CSS').matched).toBe(true);

      // Node -> Node.js
      expect(matchKeywordInText('Node.js', 'Built with Node backend').matched).toBe(true);

      // Postgres -> PostgreSQL
      expect(matchKeywordInText('PostgreSQL', 'Database: Postgres 15').matched).toBe(true);

      // K8s -> Kubernetes
      expect(matchKeywordInText('Kubernetes', 'Deployed on K8s cluster').matched).toBe(true);

      // Golang -> Go
      expect(matchKeywordInText('Go', 'Backend built in Golang').matched).toBe(true);
    });

    it('strictly avoids substring false positives', () => {
      // "Java" must NOT match inside "JavaScript"
      const javaMatch = matchKeywordInText('Java', 'I am an expert JavaScript and React developer.');
      expect(javaMatch.matched).toBe(false);

      // "Go" must NOT match inside "Django" or "Google" or "Good"
      const djangoMatch = matchKeywordInText('Go', 'Django web framework and Good practices at Google');
      expect(djangoMatch.matched).toBe(false);

      // "C" must NOT match inside "CSS" or "React"
      const cMatch = matchKeywordInText('C', 'CSS3 animations and React components');
      expect(cMatch.matched).toBe(false);
    });

    it('safely handles special symbols like C++, C#, .NET', () => {
      expect(matchKeywordInText('C++', '5 years of C++ development').matched).toBe(true);
      expect(matchKeywordInText('C#', 'Experienced with C# and ASP.NET').matched).toBe(true);
      expect(matchKeywordInText('.NET', 'Built on .NET Core').matched).toBe(true);
      expect(matchKeywordInText('C#', 'Built with .NET').matched).toBe(false);
      expect(matchKeywordInText('Node.js', 'Built with Node JS').matched).toBe(true);
    });

    it('returns PARTIAL for compound skills with incomplete evidence', () => {
      const result = matchSkills(
        [{ name: 'React Native', importance: 'REQUIRED', evidence: 'React Native required' }],
        { rawText: 'React developer' },
        'requiredSkills'
      );

      expect(result.items[0].status).toBe('PARTIAL');
      expect(result.score).toBe(50);
    });

    it('handles duplicate keywords idempotently', () => {
      const keywords = ['React', 'react', 'REACT', 'TypeScript', 'typescript'];
      const result = matchKeywords(keywords, 'Experienced in React and TypeScript');

      expect(result.matchedKeywords).toEqual(['React', 'TypeScript']);
      expect(result.matchRate).toBe(100);
      expect(result.details).toHaveLength(2);
    });
  });

  describe('Experience Matcher & UNKNOWN vs MISSING Distinction', () => {
    it('returns MATCHED when candidate meets or exceeds required years', () => {
      const cv: StructuredCV = {
        rawText: 'Senior developer with 5+ years of experience in Java.',
        totalYearsOfExperience: 5,
      };
      const result = matchExperience(
        [{ name: '3+ years Java', importance: 'REQUIRED', evidence: '3+ years Java required' }],
        cv
      );

      expect(result.score).toBe(100);
      expect(result.items[0].status).toBe('MATCHED');
    });

    it('returns PARTIAL when candidate has skill but fewer years than required', () => {
      const cv: StructuredCV = {
        rawText: 'Junior developer with 1 year Java experience.',
        totalYearsOfExperience: 1,
      };
      const result = matchExperience(
        [{ name: '3+ years Java', importance: 'REQUIRED', evidence: '3+ years Java required' }],
        cv
      );

      expect(result.items[0].status).toBe('PARTIAL');
      expect(result.items[0].score).toBe(0.5);
    });

    it('returns UNKNOWN when candidate mentions skill but duration cannot be verified', () => {
      // Candidate says "Java developer" - no duration stated!
      const cv: StructuredCV = {
        rawText: 'Java developer passionate about clean code.',
        // no totalYearsOfExperience
      };
      const result = matchExperience(
        [{ name: '3 years of Java', importance: 'REQUIRED', evidence: '3 years of Java experience required' }],
        cv
      );

      expect(result.items[0].status).toBe('UNKNOWN');
      expect(result.items[0].status).not.toBe('MISSING');
      expect(result.items[0].status).not.toBe('MATCHED');
      expect(result.items[0].notes).toContain('exact duration/years cannot be verified');
    });

    it('returns MISSING when candidate does not mention the skill at all', () => {
      const cv: StructuredCV = {
        rawText: 'Python and Django developer with 5 years experience.',
        totalYearsOfExperience: 5,
      };
      const result = matchExperience(
        [{ name: '3 years of Java', importance: 'REQUIRED', evidence: '3 years of Java required' }],
        cv
      );

      expect(result.items[0].status).toBe('MISSING');
      expect(result.items[0].score).toBe(0);
    });
  });

  describe('Education Matcher', () => {
    it('matches when candidate holds higher degree than required (Master > Bachelor)', () => {
      const cv: StructuredCV = {
        rawText: 'Education: Master of Science in Software Engineering',
      };
      const result = matchEducation(
        [{ name: "Bachelor's degree", importance: 'REQUIRED', evidence: 'BSc in CS required' }],
        cv
      );

      expect(result.score).toBe(100);
      expect(result.items[0].status).toBe('MATCHED');
    });

    it('returns PARTIAL when candidate holds lower degree than required (Associate vs Bachelor)', () => {
      const cv: StructuredCV = {
        rawText: 'Education: Associate Degree in IT',
      };
      const result = matchEducation(
        [{ name: "Bachelor's degree", importance: 'REQUIRED', evidence: 'BSc in CS required' }],
        cv
      );

      expect(result.items[0].status).toBe('PARTIAL');
      expect(result.items[0].score).toBe(0.5);
    });

    it('returns MISSING when no education found', () => {
      const cv: StructuredCV = {
        rawText: 'Self-taught programmer without formal university degree',
      };
      const result = matchEducation(
        [{ name: "Bachelor's degree", importance: 'REQUIRED', evidence: 'BSc in CS required' }],
        cv
      );

      expect(result.items[0].status).toBe('MISSING');
      expect(result.score).toBe(0);
    });

    it('returns UNKNOWN when education is mentioned but degree level is not verifiable', () => {
      const result = matchEducation(
        [{ name: "Bachelor's degree", importance: 'REQUIRED', evidence: 'Bachelor degree required' }],
        { rawText: 'Education: details available on request.' }
      );

      expect(result.items[0].status).toBe('UNKNOWN');
      expect(result.items[0].status).not.toBe('MISSING');
    });
  });

  describe('End-to-End ATS Scoring Scenarios', () => {
    it('computes 100% for a perfect match', () => {
      const cv: StructuredCV = {
        rawText: `
          Alex Mercer | alex@email.com
          Full Stack Developer with 6+ years of experience.
          Skilled in JavaScript, React, Node.js, PostgreSQL, GraphQL, and Kubernetes.
          Microservices architecture design.
          Certified: AWS Certified Developer Associate.
          Education: Bachelor of Science in Computer Science.
        `,
        totalYearsOfExperience: 6,
        certifications: ['AWS Certified'],
      };

      const report = evaluateAtsMatch(cv, sampleJd);

      expect(report.overallScore).toBe(100);
      expect(report.requiredSkillsMatch).toBe(100);
      expect(report.preferredSkillsMatch).toBe(100);
      expect(report.experienceMatch).toBe(100);
      expect(report.educationMatch).toBe(100);
      expect(report.certificationMatch).toBe(100);
      expect(report.summary.totalMissing).toBe(0);
    });

    it('computes a partial match accurately (~50-70%)', () => {
      // Has JS, React, Node, but missing Postgres, AWS cert, and GraphQL
      const cv: StructuredCV = {
        rawText: `
          Alex Mercer
          Web developer with 3+ years experience.
          Skills: JavaScript, React, Node.js, Microservices.
          Education: Bachelor of Science in Information Technology.
        `,
        totalYearsOfExperience: 3,
      };

      const report = evaluateAtsMatch(cv, sampleJd);

      expect(report.overallScore).toBeGreaterThanOrEqual(50);
      expect(report.overallScore).toBeLessThanOrEqual(80);
      expect(report.summary.totalMatched).toBeGreaterThan(0);
      expect(report.summary.totalMissing).toBeGreaterThan(0);
    });

    it('computes a poor match for an unrelated profile (~10-30%)', () => {
      const cv: StructuredCV = {
        rawText: `
          John Doe
          Digital Marketing Manager with 4+ years of experience in SEO, SEM, and Google Ads.
          Managed content writing campaigns.
          Bachelor of Arts in Communications.
        `,
        totalYearsOfExperience: 4,
      };

      const report = evaluateAtsMatch(cv, sampleJd);

      expect(report.overallScore).toBeLessThanOrEqual(35);
      expect(report.requiredSkillsMatch).toBe(0);
    });

    it('computes 0% for completely unrelated or empty text with no match', () => {
      const cv: StructuredCV = {
        rawText: 'Chef and culinary specialist with expertise in French pastry.',
      };

      const report = evaluateAtsMatch(cv, sampleJd);

      expect(report.overallScore).toBeLessThan(15);
      expect(report.requiredSkillsMatch).toBe(0);
    });

    it('handles empty CV gracefully (0% overall score)', () => {
      const emptyCv: StructuredCV = {
        rawText: '',
      };

      const report = evaluateAtsMatch(emptyCv, sampleJd);

      expect(report.overallScore).toBe(0);
      expect(report.summary.totalRequirements).toBeGreaterThan(0);
      expect(report.summary.totalMatched).toBe(0);
    });

    it('handles empty Job Requirements gracefully (0% overall score without NaN)', () => {
      const emptyJd: JobRequirements = {
        jobTitle: 'Empty Role',
        requiredSkills: [],
        preferredSkills: [],
        requiredTechnologies: [],
        preferredTechnologies: [],
        requiredExperience: [],
        educationRequirements: [],
        certifications: [],
        languages: [],
        responsibilities: [],
        softSkills: [],
        importantKeywords: [],
      };

      const cv: StructuredCV = {
        rawText: 'Developer with JavaScript experience',
      };

      const report = evaluateAtsMatch(cv, emptyJd);

      expect(report.overallScore).toBe(0);
      expect(Number.isNaN(report.overallScore)).toBe(false);
      expect(report.summary.totalRequirements).toBe(0);
    });

    it('does not penalize candidates for missing/omitted categories in the JD', () => {
      // JD has only requiredSkills, NO certifications, NO preferred skills, NO education
      const focusedJd: JobRequirements = {
        jobTitle: 'Frontend Dev',
        requiredSkills: [
          { name: 'React', importance: 'REQUIRED', evidence: 'React' },
        ],
        preferredSkills: [],
        requiredTechnologies: [],
        preferredTechnologies: [],
        requiredExperience: [],
        educationRequirements: [],
        certifications: [],
        languages: [],
        responsibilities: [],
        softSkills: [],
        importantKeywords: [],
      };

      const cv: StructuredCV = {
        rawText: 'React developer',
      };

      const report = evaluateAtsMatch(cv, focusedJd);

      // Should be 100% since the single required skill was matched
      expect(report.overallScore).toBe(100);
    });

    it('respects configurable weights deterministically', () => {
      const cv: StructuredCV = {
        rawText: `
          Developer skilled in JavaScript, React, Node.js, and PostgreSQL.
          No degree, no certifications.
          1 year of experience.
        `,
        totalYearsOfExperience: 1,
      };

      // Configuration 1: Heavy emphasis on skills (80%)
      const skillsHeavyWeights = {
        ...DEFAULT_SCORE_WEIGHTS,
        requiredSkills: 80,
        experience: 10,
        education: 5,
        certifications: 5,
      };

      // Configuration 2: Heavy emphasis on education & experience (80%)
      const expHeavyWeights = {
        ...DEFAULT_SCORE_WEIGHTS,
        requiredSkills: 10,
        experience: 50,
        education: 30,
        certifications: 10,
      };

      const reportSkills = evaluateAtsMatch(cv, sampleJd, skillsHeavyWeights);
      const reportExp = evaluateAtsMatch(cv, sampleJd, expHeavyWeights);

      // Skills heavy should score higher than experience heavy for this candidate
      expect(reportSkills.overallScore).toBeGreaterThan(reportExp.overallScore);

      // Determinism: calling with same inputs produces identical scores
      const reportSkills2 = evaluateAtsMatch(cv, sampleJd, skillsHeavyWeights);
      expect(reportSkills.overallScore).toBe(reportSkills2.overallScore);
    });
  });
});
