import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'whiteboard.json');

// Helper to ensure directory exists
async function ensureDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export async function GET() {
    try {
        await ensureDir();
        try {
            const data = await fs.readFile(FILE_PATH, 'utf-8');
            const json = JSON.parse(data);

            // Migration: If it's not an array, wrap it in an array
            if (!Array.isArray(json)) {
                // Determine if it has isVisible content structure or legacy tiptap
                let content = json;
                let isVisible = true;
                if (json.content && typeof json.isVisible !== 'undefined' && !json.type) {
                    content = json.content;
                    isVisible = json.isVisible;
                }

                // Create minimal ID
                const initialBoard = {
                    id: 'default',
                    title: 'Quadro Principal',
                    content,
                    isVisible
                };
                return NextResponse.json([initialBoard]);
            }
            return NextResponse.json(json);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return NextResponse.json([
                    {
                        id: 'default',
                        title: 'Quadro Principal',
                        content: {
                            type: 'doc',
                            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bem-vindo ao Quadro de Avisos!' }] }]
                        },
                        isVisible: true
                    }
                ]);
            }
            throw error;
        }
    } catch (error) {
        console.error('Error reading whiteboard:', error);
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await ensureDir();
        const content = await request.json();
        // Expecting content to be an array of boards
        if (!Array.isArray(content)) {
            return NextResponse.json({ error: 'Invalid data format: expected array' }, { status: 400 });
        }
        await fs.writeFile(FILE_PATH, JSON.stringify(content, null, 2), 'utf-8');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving whiteboard:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
