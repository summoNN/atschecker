/**
 * Canonical technology & skill alias mapping.
 * All keys and values are stored in lowercase for normalized lookups.
 */
export const ALIAS_MAP: Record<string, string[]> = {
  javascript: ['js', 'ecmascript', 'es6', 'es2015', 'es2020', 'es2022'],
  typescript: ['ts'],
  'node.js': ['node', 'nodejs'],
  postgresql: ['postgres', 'pgsql'],
  react: ['react.js', 'reactjs'],
  'vue.js': ['vue', 'vuejs'],
  angular: ['angularjs', 'angular.js', 'angular2+'],
  kubernetes: ['k8s', 'kube'],
  aws: ['amazon web services', 'amazon aws'],
  gcp: ['google cloud', 'google cloud platform'],
  azure: ['microsoft azure', 'ms azure'],
  mongodb: ['mongo'],
  go: ['golang'],
  python: ['python3', 'python2', 'py'],
  'c++': ['cpp', 'c plus plus'],
  'c#': ['csharp', 'c sharp'],
  '.net': ['dotnet', 'dot net'],
  docker: ['containerization', 'docker compose'],
  'ci/cd': ['ci cd', 'continuous integration', 'continuous deployment', 'cicd'],
  graphql: ['gql'],
  kafka: ['apache kafka'],
  elasticsearch: ['elastic search', 'opensearch'],
  redis: ['redis cache'],
  rest: ['restful', 'rest api', 'rest apis', 'restful apis', 'restful api'],
  sql: ['rdbms', 'relational database'],
  nosql: ['no-sql', 'non-relational'],
  terraform: ['tf', 'iac', 'infrastructure as code'],
  html: ['html5'],
  css: ['css3'],
  sass: ['scss'],
  tailwind: ['tailwindcss', 'tailwind css'],
  jest: ['jest testing'],
  vitest: ['vitest testing'],
};

/**
 * Inverted index: maps any alias (or canonical name) to its canonical identifier
 */
const CANONICAL_LOOKUP: Map<string, string> = new Map();

for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
  CANONICAL_LOOKUP.set(canonical.toLowerCase(), canonical.toLowerCase());
  for (const alias of aliases) {
    CANONICAL_LOOKUP.set(alias.toLowerCase(), canonical.toLowerCase());
  }
}

/**
 * Returns the canonical name for a given technology or skill term, if an alias exists.
 */
export function getCanonicalName(term: string): string {
  const normalized = term.trim().toLowerCase();
  return CANONICAL_LOOKUP.get(normalized) ?? normalized;
}

/**
 * Returns all recognized variations/aliases for a term (including the term itself).
 */
export function getTermVariations(term: string): string[] {
  const canonical = getCanonicalName(term);
  const aliases = ALIAS_MAP[canonical] ?? [];
  return Array.from(new Set([canonical, ...aliases, term.trim().toLowerCase()]));
}
