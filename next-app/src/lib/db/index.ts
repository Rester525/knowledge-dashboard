import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    _sql = neon(url);
  }
  return _sql;
}

// Tagged template helper — defers neon() init until first call
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sql(strings: TemplateStringsArray, ...values: any[]): Promise<Record<string, unknown>[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSql()(strings, ...values) as any;
}

sql.query = (queryString: string, params?: unknown[]) => {
  return getSql().query(queryString, params);
};

export { sql };

export async function initSchema() {
  const schema = readFileSync(join(process.cwd(), 'src/lib/db/schema.sql'), 'utf8');
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await getSql().query(stmt);
  }
}
