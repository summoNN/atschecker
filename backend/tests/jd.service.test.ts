import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  JobDescriptionService,
  EmptyJobDescriptionError,
  jobRequirementsSchema,
  JobRequirements,
} from '../src/services/jobs/index.js';
import { GeminiClientLike } from '../src/services/gemini/index.js';

describe('JobDescriptionService (Unit Tests with Mocked Client)', () => {
  let mockGenerateContent: ReturnType<typeof vi.fn>;
  let mockClient: GeminiClientLike;

  beforeEach(() => {
    mockGenerateContent = vi.fn();
    mockClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };
  });

  it('rejects empty job description with EmptyJobDescriptionError', async () => {
    const service = new JobDescriptionService({ apiKey: 'test-key' }, mockClient);
    await expect(
      service.normalizeJobDescription({ jobDescription: '   \n\t  ' })
    ).rejects.toThrow(EmptyJobDescriptionError);
  });

  it('normalizes a technical job description with concrete requirements and evidence', async () => {
    const mockTechnicalResult: JobRequirements = {
      jobTitle: 'Senior Java Backend Engineer',
      requiredSkills: [
        { name: 'Java', importance: 'REQUIRED', evidence: '3+ years of Java and Spring Boot experience required' },
        { name: 'Spring Boot', importance: 'REQUIRED', evidence: '3+ years of Java and Spring Boot experience required' },
        { name: 'REST API Design', importance: 'REQUIRED', evidence: 'Must have strong REST API design knowledge' },
      ],
      preferredSkills: [
        { name: 'GraphQL', importance: 'PREFERRED', evidence: 'GraphQL experience is a plus' },
      ],
      requiredTechnologies: [
        { name: 'Java', importance: 'REQUIRED', evidence: '3+ years of Java and Spring Boot experience required' },
        { name: 'PostgreSQL', importance: 'REQUIRED', evidence: 'Hands-on experience with PostgreSQL' },
      ],
      preferredTechnologies: [
        { name: 'Docker', importance: 'PREFERRED', evidence: 'Containerization with Docker preferred' },
      ],
      requiredExperience: [
        { name: '3+ years backend experience', importance: 'REQUIRED', evidence: '3+ years of Java and Spring Boot experience required' },
      ],
      educationRequirements: [
        { name: "Bachelor's degree in Computer Science", importance: 'REQUIRED', evidence: 'BSc in Computer Science or equivalent' },
      ],
      certifications: [],
      languages: [],
      responsibilities: [
        { name: 'Design and maintain microservices', importance: 'REQUIRED', evidence: 'You will design and maintain high-throughput microservices' },
      ],
      softSkills: [
        { name: 'Problem-solving', importance: 'REQUIRED', evidence: 'Excellent analytical and problem-solving mindset' },
      ],
      importantKeywords: [
        { name: 'Microservices', importance: 'REQUIRED', evidence: 'high-throughput microservices' },
        { name: 'PostgreSQL', importance: 'REQUIRED', evidence: 'Hands-on experience with PostgreSQL' },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockTechnicalResult),
    });

    const service = new JobDescriptionService({ apiKey: 'test-key' }, mockClient);
    const result = await service.normalizeJobDescription({
      jobDescription: `
        Senior Java Backend Engineer needed.
        3+ years of Java and Spring Boot experience required.
        Must have strong REST API design knowledge and hands-on experience with PostgreSQL.
        Containerization with Docker and GraphQL experience is a plus.
        BSc in Computer Science or equivalent.
        You will design and maintain high-throughput microservices.
        Excellent analytical and problem-solving mindset.
      `,
    });

    // Validates against Zod schema
    const validation = jobRequirementsSchema.safeParse(result);
    expect(validation.success).toBe(true);

    expect(result.jobTitle).toBe('Senior Java Backend Engineer');
    expect(result.requiredSkills).toHaveLength(3);
    expect(result.requiredSkills.map((s) => s.name)).toContain('Java');
    expect(result.requiredSkills.map((s) => s.name)).toContain('Spring Boot');
    expect(result.requiredTechnologies.map((t) => t.name)).toContain('PostgreSQL');
    expect(result.preferredTechnologies[0].name).toBe('Docker');
    expect(result.requiredExperience[0].evidence).toContain('3+ years of Java and Spring Boot');
  });

  it('normalizes a non-technical job description accurately', async () => {
    const mockNonTechResult: JobRequirements = {
      jobTitle: 'Senior Customer Success Manager',
      requiredSkills: [
        { name: 'Client Relationship Management', importance: 'REQUIRED', evidence: 'Proven track record managing enterprise accounts' },
        { name: 'Account Renewal & Upselling', importance: 'REQUIRED', evidence: 'Responsible for net retention and account expansion' },
      ],
      preferredSkills: [
        { name: 'SaaS Onboarding', importance: 'PREFERRED', evidence: 'Experience with B2B SaaS onboarding workflows preferred' },
      ],
      requiredTechnologies: [
        { name: 'Salesforce CRM', importance: 'REQUIRED', evidence: 'Must have hands-on proficiency in Salesforce' },
        { name: 'Gainsight', importance: 'REQUIRED', evidence: 'Proficiency in Gainsight or similar CS platform' },
      ],
      preferredTechnologies: [
        { name: 'Zendesk', importance: 'PREFERRED', evidence: 'Zendesk familiarity is a plus' },
      ],
      requiredExperience: [
        { name: '5+ years in Customer Success', importance: 'REQUIRED', evidence: 'Minimum 5 years of customer success experience in enterprise tech' },
      ],
      educationRequirements: [
        { name: "Bachelor's degree", importance: 'REQUIRED', evidence: 'BA/BS degree required' },
      ],
      certifications: [],
      languages: [
        { name: 'Fluent English and German', importance: 'REQUIRED', evidence: 'Fluency in English and German is mandatory' },
      ],
      responsibilities: [
        { name: 'Own portfolio of tier-1 enterprise clients', importance: 'REQUIRED', evidence: 'Directly manage top tier customer relationships' },
      ],
      softSkills: [
        { name: 'Active Listening', importance: 'REQUIRED', evidence: 'Outstanding listening and empathy' },
        { name: 'Executive Presentation', importance: 'REQUIRED', evidence: 'Strong presentation skills to C-level stakeholders' },
      ],
      importantKeywords: [
        { name: 'Net Retention', importance: 'REQUIRED', evidence: 'net retention metrics' },
        { name: 'Enterprise Accounts', importance: 'REQUIRED', evidence: 'managing enterprise accounts' },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockNonTechResult),
    });

    const service = new JobDescriptionService({ apiKey: 'test-key' }, mockClient);
    const result = await service.normalizeJobDescription({
      jobDescription: `
        Senior Customer Success Manager.
        Minimum 5 years of customer success experience in enterprise tech.
        Proven track record managing enterprise accounts with responsibility for net retention and account expansion.
        Must have hands-on proficiency in Salesforce and Gainsight. Zendesk familiarity is a plus.
        Fluency in English and German is mandatory.
        BA/BS degree required.
      `,
    });

    expect(result.jobTitle).toBe('Senior Customer Success Manager');
    expect(result.requiredExperience[0].name).toContain('5+ years');
    expect(result.languages).toHaveLength(1);
    expect(result.languages[0].name).toContain('English and German');
    expect(result.softSkills.map((s) => s.name)).toContain('Executive Presentation');
  });

  it('normalizes a short 2-sentence job description without crashing', async () => {
    const mockShortResult: JobRequirements = {
      jobTitle: 'Python Web Scraper Developer',
      requiredSkills: [
        { name: 'Web Scraping', importance: 'REQUIRED', evidence: 'We need a Python developer to build web scrapers' },
      ],
      preferredSkills: [],
      requiredTechnologies: [
        { name: 'Python', importance: 'REQUIRED', evidence: 'Python developer' },
        { name: 'BeautifulSoup', importance: 'REQUIRED', evidence: 'Must know BeautifulSoup' },
      ],
      preferredTechnologies: [],
      requiredExperience: [],
      educationRequirements: [],
      certifications: [],
      languages: [],
      responsibilities: [
        { name: 'Build web scrapers', importance: 'REQUIRED', evidence: 'build web scrapers' },
      ],
      softSkills: [],
      importantKeywords: [
        { name: 'Web Scraping', importance: 'REQUIRED', evidence: 'build web scrapers' },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockShortResult),
    });

    const service = new JobDescriptionService({ apiKey: 'test-key' }, mockClient);
    const result = await service.normalizeJobDescription({
      jobDescription: 'We need an experienced Python developer to build web scrapers. Must know BeautifulSoup.',
    });

    expect(result.jobTitle).toBe('Python Web Scraper Developer');
    expect(result.requiredTechnologies.map((t) => t.name)).toEqual(['Python', 'BeautifulSoup']);
    expect(result.certifications).toEqual([]);
    expect(result.educationRequirements).toEqual([]);
  });

  it('normalizes a long, multi-section enterprise job description', async () => {
    const mockLongResult: JobRequirements = {
      jobTitle: 'Principal Cloud Architect',
      requiredSkills: [
        { name: 'Cloud Infrastructure Architecture', importance: 'REQUIRED', evidence: '10+ years designing enterprise multi-cloud systems' },
        { name: 'Infrastructure as Code', importance: 'REQUIRED', evidence: 'Deep expertise in Terraform and Pulumi' },
      ],
      preferredSkills: [
        { name: 'FinOps Cost Optimization', importance: 'PREFERRED', evidence: 'Knowledge of FinOps cloud cost management is advantageous' },
      ],
      requiredTechnologies: [
        { name: 'AWS', importance: 'REQUIRED', evidence: 'Expert AWS cloud proficiency' },
        { name: 'Kubernetes', importance: 'REQUIRED', evidence: 'Production Kubernetes management' },
        { name: 'Terraform', importance: 'REQUIRED', evidence: 'Terraform IaC automation' },
      ],
      preferredTechnologies: [
        { name: 'GCP', importance: 'PREFERRED', evidence: 'Secondary experience with Google Cloud Platform is welcome' },
      ],
      requiredExperience: [
        { name: '10+ years infrastructure experience', importance: 'REQUIRED', evidence: '10+ years designing enterprise multi-cloud systems' },
      ],
      educationRequirements: [
        { name: 'Degree in Engineering or equivalent practical experience', importance: 'INFORMATIONAL', evidence: 'Degree or equivalent practical experience' },
      ],
      certifications: [
        { name: 'AWS Solutions Architect Professional', importance: 'REQUIRED', evidence: 'Must hold AWS Certified Solutions Architect Professional' },
        { name: 'CKA (Certified Kubernetes Administrator)', importance: 'PREFERRED', evidence: 'CKA certification is strongly preferred' },
      ],
      languages: [],
      responsibilities: [
        { name: 'Define enterprise cloud strategy', importance: 'REQUIRED', evidence: 'Establish organizational cloud adoption architecture' },
      ],
      softSkills: [
        { name: 'Stakeholder Influence', importance: 'REQUIRED', evidence: 'Ability to influence executive technical leadership' },
      ],
      importantKeywords: [
        { name: 'Multi-cloud', importance: 'REQUIRED', evidence: 'multi-cloud systems' },
        { name: 'FinOps', importance: 'PREFERRED', evidence: 'FinOps cloud cost management' },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockLongResult),
    });

    const service = new JobDescriptionService({ apiKey: 'test-key' }, mockClient);
    const result = await service.normalizeJobDescription({
      jobDescription: `
        ABOUT GLOBAL FINANCIAL CORP
        Global Financial Corp is a Fortune 500 company leading digital banking...
        
        ROLE SUMMARY
        We are seeking a Principal Cloud Architect to establish our next-generation multi-cloud banking backbone.
        
        RESPONSIBILITIES
        - Establish organizational cloud adoption architecture across global teams.
        - Mentor senior engineers and lead architecture review boards.
        
        REQUIRED QUALIFICATIONS
        - 10+ years designing enterprise multi-cloud systems.
        - Expert AWS cloud proficiency and production Kubernetes management.
        - Terraform IaC automation expertise.
        - Must hold AWS Certified Solutions Architect Professional.
        - Ability to influence executive technical leadership.
        
        PREFERRED QUALIFICATIONS
        - CKA certification is strongly preferred.
        - Secondary experience with Google Cloud Platform is welcome.
        - Knowledge of FinOps cloud cost management is advantageous.
      `,
    });

    expect(result.jobTitle).toBe('Principal Cloud Architect');
    expect(result.certifications).toHaveLength(2);
    expect(result.certifications[0].importance).toBe('REQUIRED');
    expect(result.certifications[1].importance).toBe('PREFERRED');
    expect(result.requiredExperience[0].name).toContain('10+ years');
  });

  it('never invents requirements when sections are omitted in the JD', async () => {
    const mockMinimalResult: JobRequirements = {
      jobTitle: 'Junior Frontend Developer',
      requiredSkills: [
        { name: 'HTML/CSS/JavaScript', importance: 'REQUIRED', evidence: 'Solid fundamentals in HTML, CSS, and modern JavaScript' },
      ],
      preferredSkills: [],
      requiredTechnologies: [
        { name: 'React', importance: 'REQUIRED', evidence: 'Working familiarity with React' },
      ],
      preferredTechnologies: [],
      requiredExperience: [
        { name: '1+ year experience or internship', importance: 'REQUIRED', evidence: 'At least 1 year of hands-on experience or internship' },
      ],
      // Completely missing sections in the JD:
      educationRequirements: [],
      certifications: [],
      languages: [],
      responsibilities: [],
      softSkills: [],
      importantKeywords: [
        { name: 'React', importance: 'REQUIRED', evidence: 'Working familiarity with React' },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockMinimalResult),
    });

    const service = new JobDescriptionService({ apiKey: 'test-key' }, mockClient);
    const result = await service.normalizeJobDescription({
      jobDescription: `
        Junior Frontend Developer wanted.
        Solid fundamentals in HTML, CSS, and modern JavaScript.
        Working familiarity with React.
        At least 1 year of hands-on experience or internship.
      `,
    });

    // Verify omitted sections are empty arrays and not fabricated
    expect(result.educationRequirements).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.languages).toEqual([]);
    expect(result.responsibilities).toEqual([]);
    expect(result.softSkills).toEqual([]);
  });

  it('filters generic words and includes evidence for every item', async () => {
    const mockResult: JobRequirements = {
      jobTitle: 'Backend Engineer',
      requiredSkills: [
        { name: 'Golang', importance: 'REQUIRED', evidence: '3+ years of Golang experience' },
      ],
      preferredSkills: [],
      requiredTechnologies: [
        { name: 'Go', importance: 'REQUIRED', evidence: '3+ years of Golang experience' },
        { name: 'gRPC', importance: 'REQUIRED', evidence: 'Strong gRPC protocol skills' },
      ],
      preferredTechnologies: [],
      requiredExperience: [
        { name: '3+ years Go experience', importance: 'REQUIRED', evidence: '3+ years of Golang experience' },
      ],
      educationRequirements: [],
      certifications: [],
      languages: [],
      responsibilities: [],
      softSkills: [],
      importantKeywords: [
        { name: 'gRPC', importance: 'REQUIRED', evidence: 'Strong gRPC protocol skills' },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockResult),
    });

    const service = new JobDescriptionService({ apiKey: 'test-key' }, mockClient);
    const result = await service.normalizeJobDescription({
      jobDescription: 'Great company, collaborative team, high impact work. 3+ years of Golang experience and strong gRPC protocol skills.',
    });

    const allNames = [
      ...result.requiredSkills.map((i) => i.name.toLowerCase()),
      ...result.importantKeywords.map((i) => i.name.toLowerCase()),
    ];

    // Generic words filtered out
    expect(allNames).not.toContain('company');
    expect(allNames).not.toContain('team');
    expect(allNames).not.toContain('work');

    // Evidence verified on all items
    result.requiredSkills.forEach((item) => {
      expect(item.evidence).toBeTruthy();
      expect(['REQUIRED', 'PREFERRED', 'INFORMATIONAL']).toContain(item.importance);
    });
  });
});
