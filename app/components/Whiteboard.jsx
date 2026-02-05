'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import React, { useEffect, useState, useCallback } from 'react';
import {
    Bold, Italic, Strikethrough, List, ListOrdered,
    Palette, Highlighter, Undo, Redo, Type,
    AlignLeft, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react';

// Custom Font Size Extension
const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: fontSize => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run();
            },
        };
    },
});

const fontSizes = ['10', '11', '12', '16', '18', '20', '24', '40', '44', '48', '64', '80', '88'];

const MenuBar = ({ editor }) => {
    // State to force re-render when editor selection/content changes
    const [, setUpdateCounter] = useState(0);

    // Force re-render when editor state changes
    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            setUpdateCounter(c => c + 1);
        };

        editor.on('selectionUpdate', handleUpdate);
        editor.on('transaction', handleUpdate);
        editor.on('update', handleUpdate); // Ensure content updates also trigger

        return () => {
            editor.off('selectionUpdate', handleUpdate);
            editor.off('transaction', handleUpdate);
            editor.off('update', handleUpdate);
        };
    }, [editor]);

    if (!editor) return null;

    // Font family options for matching
    const fontFamilyOptions = [
        { value: 'default', label: 'Fonte Padrão' },
        { value: 'Aptos', label: 'Aptos' },
        { value: 'Montserrat', label: 'Montserrat' },
        { value: 'Inter', label: 'Inter' },
        { value: 'Arial', label: 'Arial' },
        { value: "'Courier New'", label: 'Courier' },
    ];

    // Get current font family from editor and find matching option
    const editorFontFamily = editor.getAttributes('textStyle').fontFamily || '';
    const matchedFont = fontFamilyOptions.find(opt =>
        opt.value !== 'default' && (editorFontFamily.includes(opt.value) || editorFontFamily.includes(opt.label))
    );
    const currentFontFamily = matchedFont ? matchedFont.value : 'default';

    // Get current font size from editor
    const editorFontSize = editor.getAttributes('textStyle').fontSize || '';
    const currentFontSize = editorFontSize.replace('px', '');

    return (
        <div className="flex flex-wrap gap-2 p-3 bg-white border-b border-gray-200 rounded-t-xl sticky top-0 z-10 items-center">

            {/* Font Family */}
            <div className="flex items-center border-r border-gray-200 pr-3 mr-2">
                <select
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'default') editor.chain().focus().unsetFontFamily().run();
                        else editor.chain().focus().setFontFamily(val).run();
                    }}
                    value={currentFontFamily}
                    className="h-9 text-sm border border-gray-300 rounded-lg px-3 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 outline-none min-w-[130px] cursor-pointer"
                >
                    {fontFamilyOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Font Size */}
            <div className="flex items-center border-r border-gray-200 pr-3 mr-2 gap-1">
                <select
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val) editor.chain().focus().setFontSize(`${val}px`).run();
                    }}
                    value={currentFontSize}
                    className="h-9 text-sm border border-gray-300 rounded-lg px-3 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 min-w-[80px] outline-none cursor-pointer"
                >
                    <option value="">Tamanho</option>
                    {fontSizes.map(size => (
                        <option key={size} value={size}>{size}px</option>
                    ))}
                </select>

                {/* Decrease Font Size Button */}
                <button
                    onClick={() => {
                        const currentIndex = fontSizes.indexOf(currentFontSize);
                        const newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                        editor.chain().focus().setFontSize(`${fontSizes[newIndex]}px`).run();
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Diminuir Fonte"
                >
                    <span className="text-sm font-medium">A</span>
                    <span className="text-[10px] align-super">−</span>
                </button>

                {/* Increase Font Size Button */}
                <button
                    onClick={() => {
                        const currentIndex = fontSizes.indexOf(currentFontSize);
                        const newIndex = currentIndex < fontSizes.length - 1 ? currentIndex + 1 : (currentIndex === -1 ? 0 : fontSizes.length - 1);
                        editor.chain().focus().setFontSize(`${fontSizes[newIndex]}px`).run();
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Aumentar Fonte"
                >
                    <span className="text-base font-medium">A</span>
                    <span className="text-[10px] align-super">+</span>
                </button>
            </div>

            <div className="flex gap-1 border-r border-gray-200 pr-2 items-center">
                {/* Preset Colors */}
                {[
                    '#000000', '#2563EB', '#DC2626', '#16A34A', '#D97706', '#9333EA'
                ].map(color => (
                    <button
                        key={color}
                        onClick={() => editor.chain().focus().setColor(color).run()}
                        className={`w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform ${editor.getAttributes('textStyle').color === color ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                        style={{ backgroundColor: color }}
                        title={color}
                    />
                ))}

                {/* Custom Picker */}
                <div className="relative group ml-1">
                    <label htmlFor="color-picker" className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer flex items-center justify-center">
                        <Palette className="w-5 h-5" />
                    </label>
                    <input
                        id="color-picker"
                        type="color"
                        onInput={event => editor.chain().focus().setColor(event.target.value).run()}
                        value={editor.getAttributes('textStyle').color || '#000000'}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        title="Cor Personalizada"
                    />
                </div>

                <button
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive('highlight') ? 'bg-yellow-200 text-orange-700' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Marca-texto"
                >
                    <Highlighter className="w-5 h-5" />
                </button>
            </div>


            <div className="flex gap-1 border-r border-gray-200 pr-2">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Negrito"
                >
                    <Bold className="w-5 h-5" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Itálico"
                >
                    <Italic className="w-5 h-5" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive('strike') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Riscado"
                >
                    <Strikethrough className="w-5 h-5" />
                </button>
            </div>

            <div className="flex gap-1 border-r border-gray-200 pr-2">
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Lista com Marcadores"
                >
                    <List className="w-5 h-5" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Lista Numerada"
                >
                    <ListOrdered className="w-5 h-5" />
                </button>
            </div>

            {/* Text Alignment */}
            <div className="flex gap-1 border-r border-gray-200 pr-2">
                <button
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Alinhar à Esquerda"
                >
                    <AlignLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Centralizar"
                >
                    <AlignCenter className="w-5 h-5" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Alinhar à Direita"
                >
                    <AlignRight className="w-5 h-5" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Justificar"
                >
                    <AlignJustify className="w-5 h-5" />
                </button>
            </div>

            <div className="flex gap-1 ml-auto">
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 disabled:opacity-30"
                    title="Desfazer"
                >
                    <Undo className="w-5 h-5" />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 disabled:opacity-30"
                    title="Refazer"
                >
                    <Redo className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

// Smart Formatting Extension
const SmartFormatting = Extension.create({
    name: 'smartFormatting',

    addKeyboardShortcuts() {
        return {
            'Tab': () => {
                const { editor } = this;
                const { state } = editor.view;
                const { selection } = state;
                const { $from } = selection;

                // Get the range from start of paragraph to cursor
                const from = $from.start();
                const to = $from.pos;

                // Create a transaction to format the range
                const tr = state.tr;

                // 1. Apply blue color, font, size, and bold to existing text
                const styleMarks = [
                    state.schema.marks.textStyle.create({
                        fontFamily: 'Aptos',
                        fontSize: '20px',
                        color: '#3A5481'
                    }),
                    state.schema.marks.bold.create()
                ];

                // Apply marks to the range
                styleMarks.forEach(mark => {
                    tr.addMark(from, to, mark);
                });

                // 2. Insert the arrow at cursor position
                tr.insertText(' → ', to);

                // 3. Set stored marks for next typing (black color, keep font/size/bold)
                const nextMarks = [
                    state.schema.marks.textStyle.create({
                        fontFamily: 'Aptos',
                        fontSize: '20px',
                        color: '#000000'
                    }),
                    state.schema.marks.bold.create()
                ];

                tr.setStoredMarks(nextMarks);

                // Dispatch the transaction
                editor.view.dispatch(tr);
                return true;
            },
        };
    },
});

export default function Whiteboard({ initialContent, onUpdate, readOnly = false }) {
    // Split initial content into title and body
    // Handle both legacy (direct content) and new ({title, body}) structures
    const [titleContent, setTitleContent] = useState(() => {
        if (initialContent && typeof initialContent === 'object' && initialContent.title) {
            return initialContent.title;
        }
        // Return a default JSON doc for title if possible, or string which Tiptap converts
        return {
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
        };
    });

    const [bodyContent, setBodyContent] = useState(() => {
        if (initialContent && typeof initialContent === 'object') {
            if (initialContent.body) return initialContent.body;
            // If it doesn't have body/title structure but has content, treat as legacy body
            // But exclude if it looks like the new structure container
            if (!initialContent.title && !initialContent.body && Object.keys(initialContent).length > 0) {
                return initialContent;
            }
        }
        return '';
    });

    const [activeEditor, setActiveEditor] = useState(null);

    // Title Editor - Fully featured but styled as header
    const titleEditor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                paragraph: {
                    HTMLAttributes: {
                        class: 'title-paragraph',
                        // Remove forced style, let marks/classes handle it
                    }
                }
            }),
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Highlight.configure({ multicolor: true }),
        ],
        content: titleContent,
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[60px]',
                // Removed hardcoded style to allow formatting
            },
            handleDOMEvents: {
                focus: () => {
                    setActiveEditor(titleEditor);
                    return false;
                }
            }
        },
        onUpdate: ({ editor }) => {
            const content = editor.getJSON(); // Save as JSON for rich text
            setTitleContent(content);
            if (onUpdate) {
                onUpdate({
                    title: content,
                    body: bodyEditor?.getJSON()
                });
            }
        },
        onSelectionUpdate: ({ editor }) => {
            setActiveEditor(editor);
        }
    });

    // Body Editor - Full featured
    const bodyEditor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            SmartFormatting,
            Highlight.configure({
                multicolor: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: bodyContent,
        onUpdate: ({ editor }) => {
            setBodyContent(editor.getJSON());
            if (onUpdate) {
                onUpdate({
                    title: titleEditor?.getJSON(),
                    body: editor.getJSON()
                });
            }
        },
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none focus:outline-none h-full p-8 leading-snug',
            },
            handleDOMEvents: {
                focus: () => {
                    setActiveEditor(bodyEditor);
                    return false;
                }
            }
        },
        onSelectionUpdate: ({ editor }) => {
            setActiveEditor(editor);
        }
    });

    // Set default active editor
    useEffect(() => {
        if (bodyEditor && !activeEditor) {
            setActiveEditor(bodyEditor);
        }
    }, [bodyEditor, activeEditor]);

    // Handle readOnly prop changes
    useEffect(() => {
        titleEditor?.setEditable(!readOnly);
        bodyEditor?.setEditable(!readOnly);
    }, [readOnly, titleEditor, bodyEditor]);

    if (!titleEditor || !bodyEditor) return <div className="p-10 text-center text-gray-400">Carregando editor...</div>;

    return (
        <div className={`flex flex-col h-full bg-gray-100 overflow-hidden ${readOnly ? 'bg-black flex items-center justify-center' : ''}`}>
            {!readOnly && <MenuBar editor={activeEditor || bodyEditor} />}

            <div className={`flex-1 w-full overflow-hidden flex items-center justify-center ${readOnly ? '' : 'p-4 md:p-8'}`}>
                <div
                    className={`bg-white shadow-2xl transition-all duration-300 w-full relative flex flex-col ${readOnly ? 'h-auto max-h-full max-w-full' : 'max-w-6xl'}`}
                    style={{ aspectRatio: '16/9' }}
                >
                    {/* Title Section */}
                    <div className="border-b-2 border-gray-200 p-6 bg-gray-50 bg-opacity-50">
                        <EditorContent
                            editor={titleEditor}
                            className="w-full"
                            onClick={() => setActiveEditor(titleEditor)}
                        />
                    </div>

                    {/* Body Section */}
                    <div
                        className="flex-1 overflow-y-auto relative z-10"
                        onClick={() => setActiveEditor(bodyEditor)}
                    >
                        <EditorContent
                            editor={bodyEditor}
                            className="h-full w-full"
                        />
                    </div>

                    {/* Watermark Logo */}
                    <div className="absolute bottom-6 right-8 pointer-events-none select-none z-0 opacity-90">
                        <img
                            src="/minilogo.png"
                            alt="Logo"
                            className="h-12 w-auto object-contain"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
