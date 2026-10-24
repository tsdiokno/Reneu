import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { cleanNaturalSynthesis } from './src/utils/synthesisText';
import {
  SynthesisSkill,
  getRuntimeSkills,
  formatSkillsForSystemPrompt,
} from './src/skills/runtimeSkills';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function resolvePort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const val = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(val) && val !== 8080) return val;
  }
  // In development / AI Studio preview environment, NGINX is on 8080 and proxies to 3000.
  // The dev server MUST always bind to port 3000.
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    const val = parseInt(process.env.PORT, 10);
    if (!isNaN(val)) return val;
  }
  return 3000;
}

const PORT = resolvePort();

// Security Hardening: Trust immediate reverse proxy (Cloud Run / NGINX) to safely obtain client IP
app.set('trust proxy', 1);

// Security Hardening: Disable Express fingerprinting header (OWASP A05:2021)
app.disable('x-powered-by');

// Security Hardening: Comprehensive security headers middleware (OWASP A05:2021, CWE-79, CWE-1021)
app.use((_req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // Content-Security-Policy tailored to Reneu's font, Bible API, Supabase, and Google AI Studio iframe preview needs
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://*.supabase.co https://labs.bible.org https://api.github.com wss:",
      "frame-ancestors 'self' https://*.google.com https://*.run.app https://ais-*.run.app",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  );
  next();
});

// Request body size limit
app.use(express.json({ limit: '1mb' }));

// Lightweight in-memory rate limiter with DoS memory protection and secure IP resolution (CWE-290, CWE-400)
function createRateLimiter(options: { maxRequests: number; windowMs: number; message: string }) {
  const ipBuckets = new Map<string, { count: number; resetTime: number }>();
  const MAX_BUCKETS = 10000; // Prevent heap exhaustion under DDoS

  // Periodically prune expired rate limit tracking entries every 5 minutes
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipBuckets.entries()) {
      if (now > record.resetTime) {
        ipBuckets.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
  if (cleanupTimer.unref) cleanupTimer.unref();

  return (req: Request, res: Response, next: () => void) => {
    // Rely on req.ip secured via app.set('trust proxy', 1) to prevent header spoofing (CWE-290)
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    const now = Date.now();
    let record = ipBuckets.get(clientIp);

    if (!record || now > record.resetTime) {
      if (ipBuckets.size >= MAX_BUCKETS) {
        // Clear oldest entries if cap exceeded to prevent unbounded memory growth
        const firstKey = ipBuckets.keys().next().value;
        if (firstKey) ipBuckets.delete(firstKey);
      }
      record = { count: 1, resetTime: now + options.windowMs };
      ipBuckets.set(clientIp, record);
      return next();
    }

    if (record.count >= options.maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: options.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfterSec,
      });
    }

    record.count++;
    next();
  };
}

const synthesisLimiter = createRateLimiter({
  maxRequests: 6,
  windowMs: 60 * 1000,
  message: 'Too many synthesis requests. Please wait a moment before trying again.',
});

const geminiKeyTestLimiter = createRateLimiter({
  maxRequests: 6,
  windowMs: 60 * 1000,
  message: 'Too many API key verification attempts. Please wait a moment.',
});

const discardLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  message: 'Too many discard requests. Please wait a moment.',
});

interface InputNote {
  id: string;
  reference: string;
  content: string;
  isSynthesis?: boolean;
  isPlainNote?: boolean;
  title?: string;
  updatedAt?: number;
}

export type { SynthesisSkill };
export type PseudoMcpResource = SynthesisSkill;

function extractApiKey(req: Request): string | undefined {
  const headerKey = req.headers['x-gemini-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim().length > 0) {
    return headerKey.trim();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token.length > 0) return token;
  }

  if (req.body && typeof req.body.apiKey === 'string' && req.body.apiKey.trim().length > 0) {
    return req.body.apiKey.trim();
  }

  return undefined;
}

function hasConfiguredGeminiKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey.trim().length > 0 && apiKey !== 'MY_GEMINI_API_KEY');
}

function isDevModeActive(req: Request): boolean {
  // If the server process is in production mode, dev mode is NEVER active.
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const headerDevMode = req.headers['x-dev-mode'];
  if (headerDevMode === 'false' || headerDevMode === '0') return false;
  if (headerDevMode === 'true' || headerDevMode === '1') return true;

  if (req.query.dev_mode === 'false' || req.query.dev_mode === '0') return false;
  if (req.query.production === 'true' || req.query.production === '1') return false;
  if (req.query.require_api_key === 'true' || req.query.require_api_key === '1') return false;
  if (req.query.dev_mode === 'true' || req.query.dev_mode === '1') return true;

  if (req.body && typeof req.body.devMode === 'boolean') {
    return req.body.devMode;
  }

  if (process.env.DEV_MODE === 'false' || process.env.VITE_DEV_MODE === 'false') {
    return false;
  }

  return true;
}

function getGeminiClient(customApiKey?: string, isDev: boolean = false): GoogleGenAI | null {
  const effectiveUserKey =
    customApiKey && customApiKey.trim().length > 0 && customApiKey !== 'MY_GEMINI_API_KEY'
      ? customApiKey.trim()
      : undefined;

  // In production mode, AI is powered ONLY by the user's API key.
  // The server AI is never used in production.
  if (!isDev) {
    if (!effectiveUserKey) {
      return null;
    }
    return new GoogleGenAI({
      apiKey: effectiveUserKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // In development mode: prefer user's key if provided, otherwise fall back to server AI.
  const effectiveKey = effectiveUserKey || process.env.GEMINI_API_KEY;

  if (!effectiveKey || effectiveKey.trim().length === 0 || effectiveKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  return new GoogleGenAI({
    apiKey: effectiveKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Function to resolve all authoritative synthesis skills from single source of truth
// Strictly uses caller profile without retaining state in server memory across distinct users
export function getSynthesisSkills(userProfile?: string): SynthesisSkill[] {
  return getRuntimeSkills(userProfile);
}

// Backwards-compatibility alias
export const getPseudoMcpResources = getSynthesisSkills;

// Serverless / Vercel route prefix normalization:
// Ensures incoming requests match whether rewritten with or without the /api prefix.
app.use((req: Request, _res: Response, next) => {
  if (
    !req.url.startsWith('/api') &&
    (req.url.startsWith('/system/status') ||
      req.url.startsWith('/test-gemini-key') ||
      req.url.startsWith('/skills') ||
      req.url.startsWith('/mcp/') ||
      req.url.startsWith('/synthesize-notes') ||
      req.url.startsWith('/ping') ||
      req.url.startsWith('/health'))
  ) {
    req.url = '/api' + req.url;
  }
  next();
});

// GET /api/system/status - Returns runtime environment and BYOK Gemini status
app.get('/api/system/status', (req: Request, res: Response) => {
  const isDev = isDevModeActive(req);
  // Server AI key is only recognized and used in dev mode
  const hasServerKey = isDev && hasConfiguredGeminiKey();
  const repoOwner = process.env.VERCEL_GIT_REPO_OWNER;
  const repoSlug = process.env.VERCEL_GIT_REPO_SLUG;
  const githubRepo =
    (repoOwner && repoSlug ? `${repoOwner}/${repoSlug}` : '') ||
    process.env.VITE_GITHUB_REPO ||
    process.env.GITHUB_REPOSITORY ||
    '';

  const releaseTag = isDev
    ? 'Dev'
    : (process.env.GITHUB_RELEASE_TAG ||
       process.env.VITE_GITHUB_RELEASE_TAG ||
       process.env.RELEASE_TAG ||
       process.env.VERCEL_GIT_COMMIT_REF ||
       'v1.3.0');

  res.json({
    hasGeminiKey: hasServerKey,
    hasServerGeminiKey: hasServerKey,
    isDevMode: isDev,
    environment: isDev ? 'development' : 'production',
    isVercel: Boolean(process.env.VERCEL),
    defaultEngine: hasServerKey ? 'live' : 'simulated',
    releaseTag,
    githubRepo: githubRepo || undefined,
  });
});

// POST /api/test-gemini-key - Validates user's Gemini API key with a fast, lightweight ping
app.post('/api/test-gemini-key', geminiKeyTestLimiter, async (req: Request, res: Response) => {
  const userApiKey = extractApiKey(req);
  if (!userApiKey || userApiKey.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No API key provided. Please enter your Gemini API key.',
    });
  }

  // Explicitly test only the provided user key (isDev: false prevents fallback to server key)
  const ai = getGeminiClient(userApiKey, false);
  if (!ai) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Gemini API key format.',
    });
  }

  try {
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-flash-lite-latest',
    ];
    let verifiedModel: string | null = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: 'OK',
          config: {
            maxOutputTokens: 2,
            temperature: 0.1,
          },
        });
        if (response.text && response.text.trim().length > 0) {
          verifiedModel = model;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (verifiedModel) {
      return res.json({
        success: true,
        model: verifiedModel,
        message: `API key verified and operational with ${verifiedModel}.`,
      });
    }

    return res.status(400).json({
      success: false,
      message: lastError?.message || 'Could not verify key with Gemini API.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Verification request failed.',
    });
  }
});

// GET /api/skills - Returns authoritative synthesis skills
app.get('/api/skills', (req: Request, res: Response) => {
  const profile = typeof req.query.profile === 'string' ? req.query.profile : undefined;
  const skills = getSynthesisSkills(profile);
  res.json({ skills });
});

// GET /api/mcp/resources - Backwards compatibility alias
app.get('/api/mcp/resources', (req: Request, res: Response) => {
  const profile = typeof req.query.profile === 'string' ? req.query.profile : undefined;
  const resources = getSynthesisSkills(profile);
  res.json({ resources });
});

// Handler for discarded synthesis (updates dynamic living user voice memory)
async function handleDiscardSynthesis(req: Request, res: Response) {
  try {
    const rawDiscarded = req.body?.discardedSynthesis;
    const title = String(rawDiscarded?.title || 'Untitled').slice(0, 150);
    const synthesisQuote = String(rawDiscarded?.synthesisQuote || '').slice(0, 1000);
    const themes = (Array.isArray(rawDiscarded?.keyThemes) ? rawDiscarded.keyThemes : [])
      .slice(0, 8)
      .map((t: any) => String(t).slice(0, 80));
    const references = (Array.isArray(rawDiscarded?.sourceReferences) ? rawDiscarded.sourceReferences : [])
      .slice(0, 8)
      .map((r: any) => String(r).slice(0, 80));
    const currentProfile = typeof req.body?.currentProfile === 'string' ? req.body.currentProfile.slice(0, 2000) : '';
    const effectiveProfile = currentProfile || '';

    // The trajectory profile is already updated and persisted during synthesis generation.
    // Preserving the current living profile without triggering an unnecessary LLM call
    // prevents runaway token consumption when users delete or clear notes.
    const refinedProfile = effectiveProfile && effectiveProfile.trim().length > 0
      ? effectiveProfile.trim()
      : "Reflective and grounded; prioritizes direct personal engagement with scripture in clear, everyday language.";

    res.json({
      success: true,
      updatedUserProfile: refinedProfile,
      resourceUri: 'memory://user/living-profile',
      skillId: 'memory://user/living-profile',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update dynamic profile on discard' });
  }
}

// POST /api/skills/discard-synthesis - Updates user living memory
app.post('/api/skills/discard-synthesis', discardLimiter, handleDiscardSynthesis);

// POST /api/mcp/discard-synthesis - Backwards compatibility alias
app.post('/api/mcp/discard-synthesis', discardLimiter, handleDiscardSynthesis);

// Fallback generator adhering strictly to the pseudo-MCP resources (simple, concise, personal)
function generateFallbackSynthesis(sampledNotes: InputNote[], existingProfile?: string) {
  const noteA = sampledNotes[0];
  const noteB = sampledNotes[1];
  const noteC = sampledNotes[2];

  let summary = 'No notes provided for trajectory synthesis.';
  if (sampledNotes.length === 1 && noteA) {
    summary = `God's spoken word gives sovereign meaning and steadfast purpose to all of life [${noteA.reference}]. Even in seasons of uncertainty, His promises remain an unshakable foundation for quiet confidence.`;
  } else if (sampledNotes.length === 2 && noteA && noteB) {
    summary = `God's spoken word remains the ultimate foundation of truth and life [${noteA.reference}]. Even through hardship, His quiet faithfulness upholds us and turns sorrow into patient hope [${noteB.reference}].`;
  } else if (sampledNotes.length >= 3 && noteA && noteB && noteC) {
    summary = `God's spoken word gives sovereign meaning to our lives [${noteA.reference}], anchoring the heart in divine faithfulness [${noteB.reference}]. In every circumstance, His grace sustains us with quiet endurance [${noteC.reference}].`;
  } else if (sampledNotes.length > 0 && noteA) {
    summary = `God's spoken word gives sovereign meaning and steadfast purpose to all of life [${noteA.reference}].`;
  }

  const mainTitles = sampledNotes
    .map((n) => (n.isSynthesis ? n.title || 'Recursive Synthesis' : n.reference))
    .slice(0, 2)
    .join(' & ');

  const updatedProfile =
    existingProfile ||
    `Reflective and honest; uses clear, everyday language with steady theological grounding in God's promises and sovereignty. Balances personal struggle with quiet trust.`;

  return {
    title: `Steadfast Truth in ${mainTitles || 'Scripture'}`,
    synthesis: cleanNaturalSynthesis(summary),
    keyThemes: ["God's Word", "Steadfast Care", "Quiet Trust"],
    trajectorySummary: "Finding steady comfort in God's faithful promises even through changing seasons.",
    practicalApplication: 'None explicit in user commentaries; reflections remain grounded in theological and exegetical observation.',
    updatedUserProfile: updatedProfile,
    sampledNotes,
    isFallback: true,
  };
}

// POST /api/synthesize-notes
app.post('/api/synthesize-notes', synthesisLimiter, async (req: Request, res: Response) => {
  try {
    const {
      notes,
      sampleCount = 5,
      mode = 'random',
      userProfile,
      engineMode = 'live',
    } = req.body as {
      notes: InputNote[];
      sampleCount?: number;
      mode?: 'random' | 'recent' | 'all';
      userProfile?: string;
      engineMode?: 'simulated' | 'live';
    };

    if (!Array.isArray(notes) || notes.length === 0) {
      return res.status(400).json({ error: 'At least one note is required for synthesis.' });
    }

    if (notes.length > 200) {
      return res.status(400).json({ error: 'Payload exceeds maximum limit of 200 notes.' });
    }

    // Sanitize and bound notes payload to prevent memory exhaustion and token overflows
    const boundedNotes: InputNote[] = notes.slice(0, 150).map((n) => ({
      id: String(n.id || '').slice(0, 100),
      reference: String(n.reference || '').slice(0, 200),
      content: String(n.content || '').slice(0, 10000),
      isSynthesis: Boolean(n.isSynthesis),
      isPlainNote: Boolean(n.isPlainNote),
      title: n.title ? String(n.title).slice(0, 200) : undefined,
      updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : undefined,
    }));

    const boundedProfile = typeof userProfile === 'string' ? userProfile.slice(0, 2500) : undefined;

    // Filter valid notes with content
    const validNotes = boundedNotes.filter((n) => n.content && n.content.trim().length > 0);
    if (validNotes.length === 0) {
      return res.status(400).json({ error: 'Notes contain no readable text.' });
    }

    // Select subset based on mode (bounded between 1 and 20 notes)
    let sampledNotes: InputNote[] = [];
    const requestedCount = Math.min(Math.max(1, Number(sampleCount) || 5), 20);
    const count = Math.min(requestedCount, validNotes.length);

    if (mode === 'recent') {
      sampledNotes = [...validNotes].slice(0, count);
    } else if (mode === 'all' || count >= validNotes.length) {
      sampledNotes = [...validNotes];
    } else {
      const shuffled = [...validNotes].sort(() => Math.random() - 0.5);
      sampledNotes = shuffled.slice(0, count);
    }

    // Flipswitch check: if Simulated / Local Skill Engine is explicitly requested
    if (engineMode === 'simulated') {
      const simulated = generateFallbackSynthesis(sampledNotes, boundedProfile);
      return res.json({
        ...simulated,
        notice: 'Generated via Local Skill Engine (token-efficient heuristics and synthesis skills).',
        engine: 'skills',
      });
    }

    const userApiKey = extractApiKey(req);
    const isDev = isDevModeActive(req);

    // In production mode, an explicit Gemini API key is strictly required
    if (!userApiKey || userApiKey.trim().length === 0) {
      if (!isDev) {
        return res.status(400).json({
          error: 'A Gemini API key is required in production. Please enter your Gemini API key in Settings under Intelligent Summaries.',
          code: 'API_KEY_REQUIRED',
        });
      }
    }

    const ai = getGeminiClient(userApiKey, isDev);
    if (!ai) {
      if (!isDev) {
        return res.status(400).json({
          error: 'A valid Gemini API key is required in production. Please enter your Gemini API key in Settings under Intelligent Summaries.',
          code: 'API_KEY_REQUIRED',
        });
      }

      console.warn('GEMINI_API_KEY is not configured in server environment. Returning local skill synthesis.');
      const fallback = generateFallbackSynthesis(sampledNotes, userProfile);
      return res.json({
        ...fallback,
        notice: 'GEMINI_API_KEY is not configured in development environment. Set GEMINI_API_KEY in .env or enter a key in Settings.',
        engine: 'fallback',
      });
    }

    // Fetch authoritative synthesis skills
    const skills = getSynthesisSkills(userProfile);
    const skillsContextString = formatSkillsForSystemPrompt(skills);

    // Construct prompt with note texts
    const notesText = sampledNotes
      .map((n, idx) => {
        const typeLabel = n.isSynthesis
          ? 'Prior Synthesis Note'
          : n.isPlainNote
          ? 'Plain Reflection Note (Personal reflection without biblical chapter/verse citation)'
          : 'Verse Commentary Note';
        const dateStr = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString() : '';
        return `[Note #${idx + 1}]
Reference: ${n.reference}
Type: ${typeLabel}
Date: ${dateStr}
Content: "${n.content}"`;
      })
      .join('\n\n');

    const systemInstruction = `You generate Intelligent Summaries for a personal commentary Bible study canvas.
You operate strictly under an authoritative, token-saving Synthesis Skills architecture.

${skillsContextString}

=== CRITICAL SYNTHESIS DIRECTIVES ===
1. NATURAL, ORGANIC COMPOSITION (NO MECHANICAL ENUMERATION OR CITATION STACKING):
   - STRICTLY FORBID mechanical grouping introductions or sequential cataloging. NEVER write:
     * "Looking across [Reference 1] and [Reference 2] and [Reference 3]..."
     * "Across [Ref 1], [Ref 2], and [Ref 3]..."
     * "Tracing the movement between [Ref 1] and [Ref 2]..."
     * "Bridging [Ref 1] with [Ref 2]..."
     * "Seen in [Ref 1] and [Ref 2]..."
   - NEVER clump citation brackets together sequentially (e.g. NEVER write "[Ref A] and [Ref B]" or "[1], [2], [3]").
   - Distribute citations organically at the end of the distinct clause or thought they actually support, so the synthesis reads as pure, seamless theological and personal prose.

2. CONCISE, SIMPLE, AND PERSONAL (NOT SCHOLARLY):
   - Keep the synthesis to 2 to 3 punchy sentences (under 75 words).
   - STRICTLY FORBID academic jargon (do not use words like "ontological", "teleological", "contingency", "hermeneutic", "bedrock of intelligibility").
   - STRICTLY FORBID 3rd-person observer narration (NEVER start with "The user's theological trajectory traces..." or "The commentary reveals that...").
   - Write directly, simply, and warmly, as a thoughtful believer reflecting on God's truth.

3. HANDLE DISPARATE DENSITIES CAREFULLY:
   - The user's commentaries may vary in theological and personal density (e.g. a dense theological observation alongside a raw 1-line personal struggle or quick prayer).
   - Do NOT inflate brief personal notes with heavy academic jargon.
   - Do NOT flatten deep theological notes into generic clichés.
   - Connect the disparate densities naturally: show how God's sovereign truth meets real human fragility in plain, warm words.

3. STRICT GROUNDING & NON-ASSUMPTION (NO HALLUCINATIONS):
   - You MUST NOT assume, infer, or extrapolate doctrines, life events, psychological states, or personal confessions that the user's notes DID NOT express or clearly imply.
   - Every substantive insight MUST include an inline citation bracket [Reference] (e.g. [John 1:1], [Genesis 1:3], [Romans 8:28], or [Synthesis: Title]) indicating the exact note from which it is derived.

4. PRACTICAL APPLICATION RULE:
   - If the user's notes do not contain or clearly imply an obvious, tangible practical application (for example, if they are doctrinal, reflective, or exegetical observations), DO NOT FORCE OR INVENT ONE.
   - In that case, explicitly set practicalApplication to: "None explicit in user commentaries; reflections remain grounded in theological and exegetical observation."
   - Only provide a practical application if the user's own commentaries explicitly discuss lived obedience, ethical duty, personal prayer, or tangible praxis.

5. LIVING USER VOICE MEMORY UPDATE:
   - Provide 'updatedUserProfile': A concise (80 to 150 words) abridged memory document capturing:
     * Personal tone & voice (simple, honest, thoughtful).
     * Distinctive themes observed in the notes.
     * How high-density and personal-density notes interact in their study.
   This will be saved back into dynamic user memory (memory://user/living-profile).`;

    const userPrompt = `Here is the sampled collection of ${sampledNotes.length} notes from the user's commentary canvas:

${notesText}

Synthesize the underlying trajectory into a concise, simple, and personal 2-3 sentence statement with inline [Reference] citations, strictly adhering to the authoritative synthesis skills. Ensure the composition is completely natural and fluid—avoid mechanical listing, opening with "looking across [1] and [2]", or clumping citation brackets together.`;

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-flash-lite-latest',
    ];
    let responseText: string | null = null;
    let lastError: any = null;
    let usedModel = candidateModels[0];

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.4,
            maxOutputTokens: 500,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'A simple, evocative title (2-4 words) in plain English.',
                },
                synthesis: {
                  type: Type.STRING,
                  description:
                    'A 2-3 sentence, simple, personal synthesis in a natural, fluid composition. Distribute individual [Reference] citations organically where each insight occurs; NEVER write mechanical lists like "looking across [A] and [B]" or clump citations sequentially.',
                },
                keyThemes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2-3 concise, simple motifs or themes in everyday words.',
                },
                trajectorySummary: {
                  type: Type.STRING,
                  description: 'A short one-sentence takeaway in simple, warm words.',
                },
                practicalApplication: {
                  type: Type.STRING,
                  description:
                    'Explicit practical application if clearly derived from user commentary; otherwise explicitly state "None explicit in user commentaries; reflections remain grounded in theological and exegetical observation."',
                },
                updatedUserProfile: {
                  type: Type.STRING,
                  description:
                    'An abridged profile document (80-150 words) capturing the user tone, vocabulary, and varying note densities.',
                },
              },
              required: [
                'title',
                'synthesis',
                'keyThemes',
                'trajectorySummary',
                'practicalApplication',
                'updatedUserProfile',
              ],
            },
          },
        });
        if (response.text) {
          responseText = response.text;
          usedModel = modelName;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or busy:`, err?.message || err);
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!responseText) {
      throw lastError || new Error('Empty response received from Gemini model.');
    }

    const parsedData = JSON.parse(responseText);
    const finalProfile = parsedData.updatedUserProfile || userProfile || '';

    const cleanedSynthesis = cleanNaturalSynthesis(parsedData.synthesis || '');

    return res.json({
      title: parsedData.title || 'Personal Commentary Trajectory',
      synthesis: cleanedSynthesis,
      keyThemes: parsedData.keyThemes || [],
      trajectorySummary: parsedData.trajectorySummary || '',
      practicalApplication: parsedData.practicalApplication || 'None explicit in user commentaries; reflections remain grounded in theological and exegetical observation.',
      updatedUserProfile: finalProfile,
      sampledNotes,
      isFallback: false,
      modelUsed: usedModel,
    });
  } catch (error: any) {
    console.error('Error generating commentary synthesis:', error);
    if (!isDevModeActive(req)) {
      return res.status(400).json({
        error: error?.message || 'Synthesis failed. Please verify your Gemini API key in Settings.',
        code: 'SYNTHESIS_FAILED',
      });
    }
    const sampled = (req.body?.notes || []).slice(0, 5);
    const fallback = generateFallbackSynthesis(sampled, req.body?.userProfile);
    return res.json({
      ...fallback,
      isFallback: true,
      error: error?.message || 'Synthesis encountered an issue. Displaying heuristic synthesis.',
    });
  }
});

// Network connectivity ping endpoint for PWA polling
app.get(['/api/ping', '/api/health'], (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).json({ ok: true, timestamp: Date.now() });
});

// PWA explicit asset routes
app.get(['/manifest.webmanifest', '/manifest.json'], (_req: Request, res: Response) => {
  const distManifest = path.resolve(__dirname, 'dist', 'manifest.webmanifest');
  const publicManifest = path.resolve(__dirname, 'public', 'manifest.webmanifest');
  const target = fs.existsSync(distManifest) ? distManifest : publicManifest;
  if (fs.existsSync(target)) {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(target);
  }
  res.status(404).end();
});

app.get('/sw.js', (_req: Request, res: Response, next) => {
  const swPath = path.resolve(__dirname, 'dist', 'sw.js');
  if (fs.existsSync(swPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.sendFile(swPath);
  }
  next();
});

// Vite or static serving
async function setupServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.resolve(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.warn(
        "WARNING: 'dist/index.html' not found. If running a production Node server, make sure to execute 'npm run build' first."
      );
    }
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          } else if (filePath.endsWith('.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }
        },
      })
    );
    app.use((req: Request, res: Response) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send("Application building... Please run 'npm run build' to generate production assets.");
      }
    });
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Reneu server listening on port ${PORT} (production)`);
    });
  } else {
    const http = await import('http');
    const fs = await import('fs');
    const httpServer = http.createServer(app);
    const { createServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback handler for client-side navigation in dev (Express 5 compatible)
    app.use(async (req: Request, res: Response, next) => {
      if (req.method !== 'GET' || !req.headers.accept?.includes('text/html')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });

    httpServer.on('error', (err: any) => {
      console.error('HTTP Server error:', err);
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Reneu server listening on port ${PORT} (dev: true)`);
    });
  }
}

// Export Express app for Vercel serverless functions (api/index.ts)
export { app };
export default app;

// In Vercel serverless environment, Vercel routes handle requests without a persistent listener
if (!process.env.VERCEL) {
  setupServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

