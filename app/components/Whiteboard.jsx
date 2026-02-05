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

        return () => {
            editor.off('selectionUpdate', handleUpdate);
            editor.off('transaction', handleUpdate);
        };
    }, [editor]);

    if (!editor) return null;

    // Font family options for matching
    const fontFamilyOptions = [
        { value: 'default', label: 'Fonte Padrão' },
        { value: "Aptos, 'Segoe UI', sans-serif", label: 'Aptos' },
        { value: 'Inter, sans-serif', label: 'Inter' },
        { value: 'Arial, sans-serif', label: 'Arial' },
        { value: "'Courier New', Courier, monospace", label: 'Courier' },
    ];

    // Get current font family from editor and find matching option
    const editorFontFamily = editor.getAttributes('textStyle').fontFamily || '';
    const matchedFont = fontFamilyOptions.find(opt =>
        opt.value !== 'default' && editorFontFamily.includes(opt.label)
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

export default function Whiteboard({ initialContent, onUpdate, readOnly = false }) {
    // Initialize Editor
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: initialContent,
        onUpdate: ({ editor }) => {
            if (onUpdate) {
                onUpdate(editor.getJSON());
            }
        },
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'prose prose-lg max-w-none focus:outline-none h-full p-8 leading-snug',
            },
        },
    });

    // Handle readOnly prop changes
    useEffect(() => {
        editor?.setEditable(!readOnly);
    }, [readOnly, editor]);

    if (!editor) return <div className="p-10 text-center text-gray-400">Carregando editor...</div>;

    // Aspect ratio container logic
    // We want the editor area (canvas) to be 16:9
    // In edit mode: we show a gray background and the "sheet" in the center
    // In readOnly: we show it centered with black background (TV style)

    return (
        <div className={`flex flex-col h-full bg-gray-100 overflow-hidden ${readOnly ? 'bg-black flex items-center justify-center' : ''}`}>
            {!readOnly && <MenuBar editor={editor} />}

            <div className={`flex-1 w-full overflow-hidden flex items-center justify-center ${readOnly ? '' : 'p-4 md:p-8'}`}>
                <div
                    className={`bg-white shadow-2xl transition-all duration-300 w-full relative ${readOnly ? 'h-auto max-h-full max-w-full' : 'max-w-6xl'}`}
                    style={{ aspectRatio: '16/9' }}
                >
                    <EditorContent
                        editor={editor}
                        className="h-full w-full overflow-y-auto"
                    />
                </div>
            </div>
        </div>
    );
}
