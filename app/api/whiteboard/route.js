import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Redis } from '@upstash/redis';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'whiteboard.json');

// Initialize Redis client safely
// This allows build/local (where env vars might be missing) to not crash immediately on import
let redis = null;
try {
    if (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) {
        redis = Redis.fromEnv();
    }
} catch (e) {
    // console.warn("Redis not configured");
}

// Helper to ensure directory exists (Local only)
async function ensureDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Helper to get default initial state
function getDefaultState() {
    return [
        {
            id: 'default',
            title: {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        attrs: { textAlign: 'center' },
                        content: [
                            {
                                type: 'text',
                                marks: [
                                    {
                                        type: 'textStyle',
                                        attrs: {
                                            fontFamily: 'Montserrat',
                                            fontSize: '44px',
                                            color: '#00358E'
                                        }
                                    },
                                    { type: 'bold' }
                                ],
                                text: 'TÍTULO'
                            }
                        ]
                    }
                ]
            },
            content: {
                type: 'doc',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bem-vindo ao Quadro de Avisos!' }] }]
            },
            isVisible: true
        }
    ];
}

export async function GET() {
    // 1. Try Upstash Redis (Production/Cloud)
    try {
        if (redis) {
            const data = await redis.get('whiteboard_data');
            if (data) {
                return NextResponse.json(data);
            }
        }
    } catch (error) {
        // Ignore KV errors (e.g. connection issues)
        // console.warn("Redis fetch failed:", error);
    }

    // 2. Fallback to Local Filesystem (Dev/Legacy)
    try {
        await ensureDir();
        try {
            const data = await fs.readFile(FILE_PATH, 'utf-8');
            const json = JSON.parse(data);

            // Migration check
            if (!Array.isArray(json)) {
                let content = json;
                let isVisible = true;
                if (json.content && typeof json.isVisible !== 'undefined' && !json.type) {
                    content = json.content;
                    isVisible = json.isVisible;
                }
                const migrated = [{
                    id: 'default',
                    title: 'Quadro Principal (Migrated)',
                    content,
                    isVisible
                }];
                return NextResponse.json(migrated);
            }
            return NextResponse.json(json);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return NextResponse.json(getDefaultState());
            }
            throw error;
        }
    } catch (error) {
        console.error('Error reading whiteboard (fs):', error);
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const content = await request.json();

        // Validate format
        if (!Array.isArray(content)) {
            return NextResponse.json({ error: 'Invalid data format: expected array' }, { status: 400 });
        }

        const promises = [];

        // 1. Write to Upstash Redis
        if (redis) {
            promises.push(
                redis.set('whiteboard_data', content)
                    .catch(() => { /* Ignore Redis errors in dev if partially configured */ })
            );
        }

        // 2. Write to Local Filesystem (Backup/Dev)
        promises.push(
            (async () => {
                try {
                    await ensureDir();
                    await fs.writeFile(FILE_PATH, JSON.stringify(content, null, 2), 'utf-8');
                } catch (e) {
                    console.error("Local save failed", e);
                }
            })()
        );

        await Promise.all(promises);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving whiteboard:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
