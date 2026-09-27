import dotenv from 'dotenv';
import { GeminiService } from '../src/services/gemini/index.js';

dotenv.config();

async function runDevTest() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    console.error('❌ GEMINI_API_KEY is not set in backend/.env.');
    console.info('👉 Please add a valid GEMINI_API_KEY to backend/.env and re-run.');
    process.exit(1);
  }

  console.info('🚀 Testing Gemini ATS analysis against live API...');
  console.info(`📌 Model: ${process.env.GEMINI_MODEL ?? 'gemini-3.8-flash'}`);

  const sampleCV = `
Alex Mercer
Senior Full Stack Engineer | alex.mercer@email.com | London, UK

EXPERIENCE:
Senior Software Engineer - FinTech Labs (2021 - Present)
- Architected high-throughput REST APIs using Node.js, Fastify, and TypeScript.
- Led migration of legacy monolith to microservices, reducing server response times by 35%.
- Implemented PostgreSQL databases with Prisma ORM, handling 2M+ daily transactions.
- Automated CI/CD pipelines with GitHub Actions and Docker.

Software Engineer - CloudTech Solutions (2018 - 2021)
- Developed responsive web interfaces using React, Redux, and TailwindCSS.
- Built backend endpoints in Express and Node.js with comprehensive Jest test coverage.

SKILLS:
TypeScript, JavaScript, Node.js, Fastify, Express, React, PostgreSQL, Docker, Git, REST APIs, CI/CD, Agile.

EDUCATION:
B.Sc. in Computer Science - University of Bristol (2018)
`;

  const sampleJD = `
Job Title: Senior Backend Engineer (Node.js / TypeScript)
Company: NextGen Financial

About the Role:
We are looking for a Senior Backend Engineer to build scalable microservices for our payment infrastructure.

Key Requirements:
- 4+ years of professional backend software development experience.
- Deep expertise in Node.js, TypeScript, and modern backend frameworks (Fastify or Express).
- Strong proficiency in relational databases (PostgreSQL) and query optimization.
- Solid understanding of containerization (Docker) and Kubernetes orchestration.
- Hands-on experience with AWS cloud services (ECS, S3, RDS).
- Familiarity with event-driven architectures (Kafka, RabbitMQ) is a strong plus.
- Proven track record writing unit, integration, and e2e tests.
`;

  try {
    const service = new GeminiService({
      apiKey,
      model: process.env.GEMINI_MODEL ?? 'gemini-3.8-flash',
      timeoutMs: 45000,
    });

    console.info('⏳ Sending analysis request to Gemini...');
    const startTime = Date.now();
    const result = await service.analyzeWithGemini({
      cvText: sampleCV,
      jobDescription: sampleJD,
      jobTitle: 'Senior Backend Engineer',
      company: 'NextGen Financial',
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.info(`\n✅ Analysis completed successfully in ${duration}s!\n`);
    console.info('═'.repeat(60));
    console.info(`🎯 ATS Overall Score: ${result.atsScore}/100`);
    console.info(`📊 Keyword Match:     ${result.keywordMatch}%`);
    console.info(`💻 Skills Match:      ${result.skillsMatch}%`);
    console.info(`📋 Requirements:      ${result.requirementsMatch}%`);
    console.info(`⏳ Experience Match:  ${result.experienceMatch}%`);
    console.info(`🎓 Education Match:   ${result.educationMatch}%`);
    console.info('═'.repeat(60));

    console.info('\n✅ Matched Keywords:');
    result.matchedKeywords.forEach((k) => console.info(`  • [${k.category}] ${k.term}`));

    console.info('\n⚠️ Missing Keywords:');
    result.missingKeywords.forEach((k) => console.info(`  • [${k.importance.toUpperCase()}] ${k.term} (${k.category})`));

    console.info('\n💡 Top Recommendations:');
    result.recommendations.forEach((r) => console.info(`  • [${r.priority}] ${r.title}: ${r.description}`));

    console.info('\n📝 Executive Summary:');
    console.info(`  ${result.explanation}\n`);
  } catch (err: unknown) {
    console.error('\n❌ Gemini Live Test Failed:');
    if (err instanceof Error) {
      console.error(`Error [${err.name}]: ${err.message}`);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

runDevTest();
