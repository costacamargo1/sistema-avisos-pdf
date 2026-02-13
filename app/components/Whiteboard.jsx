'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import {
    Bold, Italic, Strikethrough, List, ListOrdered, Star,
    Palette, Highlighter, Undo, Redo, Type,
    AlignLeft, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react';

const StarList = BulletList.extend({
    name: 'starList',
    addOptions() {
        return { itemTypeName: 'listItem', keepMarks: true, keepAttributes: true, HTMLAttributes: { class: 'star-list' } };
    },
    parseHTML() { return [{ tag: 'ul.star-list' }]; },
    renderHTML({ HTMLAttributes }) { return ['ul', this.options.HTMLAttributes, 0]; },
    addCommands() {
        return {
            toggleStarList: () => ({ commands }) => {
                return commands.toggleList(this.name, this.options.itemTypeName);
            },
        };
    },
});

const StyledOrderedList = OrderedList.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontFamily: { default: null },
            fontSize: { default: null },
            color: { default: null },
            fontWeight: { default: null },
        };
    },
    renderHTML({ HTMLAttributes }) {
        const { fontFamily, fontSize, color, fontWeight, ...rest } = HTMLAttributes;
        const styles = [];
        if (fontFamily) styles.push(`font-family: ${fontFamily}`);
        if (fontSize) styles.push(`font-size: ${fontSize}`);
        if (color) styles.push(`color: ${color}`);
        if (fontWeight) styles.push(`font-weight: ${fontWeight}`);
        const styleAttr = styles.length ? { style: styles.join('; ') } : {};
        return ['ol', mergeAttributes(this.options.HTMLAttributes, rest, styleAttr), 0];
    },
});



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

// Line Height Extension
const LineHeight = Extension.create({
    name: 'lineHeight',
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
                    lineHeight: {
                        default: null,
                        parseHTML: element => element.style.lineHeight.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.lineHeight) {
                                return {};
                            }
                            return {
                                style: `line-height: ${attributes.lineHeight}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setLineHeight: lineHeight => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { lineHeight })
                    .run();
            },
            unsetLineHeight: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { lineHeight: null })
                    .removeEmptyTextStyle()
                    .run();
            },
        };
    },
});

const fontSizes = ['10', '11', '12', '16', '18', '20', '24', '32', '36', '40', '44', '48', '58', '60', '64', '80', '88'];
const lineHeights = ['1', '1.15', '1.25', '1.5', '1.75', '2'];
const presetColors = ['#000000', '#2563EB', '#00358e', '#ff0000', '#16A34A', '#D97706', '#9333EA'];
const logoLayoutOrder = ['bottom-right-small', 'center-large', 'left-center-medium'];
const verticalAlignOrder = ['top', 'middle', 'bottom'];
const verticalAlignMeta = {
    top: {
        label: 'Topo',
        title: 'Alinhar verticalmente ao topo',
    },
    middle: {
        label: 'Meio',
        title: 'Centralizar verticalmente',
    },
    bottom: {
        label: 'Base',
        title: 'Alinhar verticalmente na base',
    },
};
const logoLayoutMeta = {
    'bottom-right-small': {
        label: 'Padrão',
        containerClass: 'absolute bottom-6 right-8 pointer-events-none select-none z-0',
        imageClass: 'h-12 w-auto object-contain',
    },
    'center-large': {
        label: 'Centralizado Grande',
        containerClass: 'absolute inset-0 pointer-events-none select-none z-0 flex items-center justify-center',
        imageClass: 'h-40 w-auto object-contain',
    },
    'left-center-medium': {
        label: 'Esquerda Grande',
        containerClass: 'absolute inset-0 left-8 pointer-events-none select-none z-0 flex items-center',
        imageClass: 'h-28 w-auto object-contain',
    },
};

const getTextStyleAttrFromMarks = (marks, attrName) =>
    marks?.find(mark => mark.type?.name === 'textStyle' && mark.attrs?.[attrName])?.attrs?.[attrName] || '';

const normalizeColor = (value) => {
    if (!value || typeof value !== 'string') return '#000000';
    const color = value.trim().toLowerCase();

    if (/^#[0-9a-f]{6}$/.test(color)) return color;
    if (/^#[0-9a-f]{3}$/.test(color)) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }

    const rgbMatch = color.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
        const [r, g, b] = rgbMatch.slice(1, 4).map(n => Math.max(0, Math.min(255, Number(n) || 0)));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    return color;
};

const normalizeFontFamily = (value = '') => value.replace(/['"]/g, '').toLowerCase();

const MenuBar = ({ editor, logoLayout = 'bottom-right-small', onChangeLogoLayout, verticalAlign = 'top', onChangeVerticalAlign }) => {
    const [toolbarState, setToolbarState] = useState({
        fontFamily: 'default',
        fontSize: '',
        lineHeight: '',
        color: '#000000',
    });
    const [lastFontSize, setLastFontSize] = useState('');

    const resolveTextStyleAttr = useCallback((attrName) => {
        if (!editor) return '';
        const attr = editor.getAttributes('textStyle')?.[attrName];
        const stored = getTextStyleAttrFromMarks(editor.state.storedMarks, attrName);
        const cursor = getTextStyleAttrFromMarks(editor.state.selection?.$from?.marks?.(), attrName);
        const selectionEmpty = editor.state.selection?.empty;

        if (selectionEmpty) return stored || attr || cursor || '';
        return attr || cursor || stored || '';
    }, [editor]);

    const syncToolbarState = useCallback(() => {
        if (!editor) return;

        const rawFontFamily = resolveTextStyleAttr('fontFamily') || '';
        const normalizedFamily = normalizeFontFamily(rawFontFamily);
        const fontFamilyCandidates = ['Aptos', 'Montserrat', 'Inter', 'Arial', "'Courier New'"];
        const matchedFamily = fontFamilyCandidates.find(opt => normalizedFamily.includes(normalizeFontFamily(opt)));

        const rawFontSize = resolveTextStyleAttr('fontSize') || '';
        const fontSize = rawFontSize ? rawFontSize.replace('px', '') : '';
        const lineHeight = resolveTextStyleAttr('lineHeight') || '';
        const color = normalizeColor(resolveTextStyleAttr('color') || '#000000');

        if (fontSize) setLastFontSize(fontSize);

        setToolbarState(prev => {
            const next = {
                fontFamily: matchedFamily || 'default',
                fontSize,
                lineHeight,
                color,
            };
            if (
                prev.fontFamily === next.fontFamily &&
                prev.fontSize === next.fontSize &&
                prev.lineHeight === next.lineHeight &&
                prev.color === next.color
            ) {
                return prev;
            }
            return next;
        });
    }, [editor, resolveTextStyleAttr]);

    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            syncToolbarState();
        };

        editor.on('selectionUpdate', handleUpdate);
        editor.on('transaction', handleUpdate);
        editor.on('update', handleUpdate);
        editor.on('focus', handleUpdate);
        handleUpdate();

        return () => {
            editor.off('selectionUpdate', handleUpdate);
            editor.off('transaction', handleUpdate);
            editor.off('update', handleUpdate);
            editor.off('focus', handleUpdate);
        };
    }, [editor, syncToolbarState]);

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

    const currentFontFamily = toolbarState.fontFamily;
    const currentFontSize = toolbarState.fontSize;
    const stepFontSize = currentFontSize || lastFontSize || '16';
    const fontSizeNumbers = fontSizes.map(size => parseInt(size, 10));
    const currentLineHeight = toolbarState.lineHeight;
    const currentColorNormalized = normalizeColor(toolbarState.color || '#000000');
    const isPresetColorSelected = presetColors.some(color => normalizeColor(color) === currentColorNormalized);

    const getStepIndex = (value, direction) => {
        const num = parseInt(value, 10);
        if (Number.isNaN(num)) {
            const defaultIndex = Math.max(0, fontSizes.indexOf('16'));
            return direction === 'up'
                ? Math.min(fontSizes.length - 1, defaultIndex + 1)
                : Math.max(0, defaultIndex - 1);
        }

        let lower = -1;
        let higher = -1;
        for (let i = 0; i < fontSizeNumbers.length; i++) {
            if (fontSizeNumbers[i] <= num) lower = i;
            if (higher === -1 && fontSizeNumbers[i] >= num) higher = i;
        }
        if (higher === -1) higher = fontSizeNumbers.length - 1;
        if (lower === -1) lower = 0;

        if (fontSizeNumbers[lower] === num) {
            return direction === 'up'
                ? Math.min(fontSizeNumbers.length - 1, lower + 1)
                : Math.max(0, lower - 1);
        }
        return direction === 'up' ? higher : lower;
    };

    const currentLogoLayout = logoLayoutMeta[logoLayout] ? logoLayout : logoLayoutOrder[0];
    const nextLogoLayout = logoLayoutOrder[(logoLayoutOrder.indexOf(currentLogoLayout) + 1) % logoLayoutOrder.length];
    const currentVerticalAlign = verticalAlignMeta[verticalAlign] ? verticalAlign : verticalAlignOrder[0];

    return (
        <div className="flex flex-wrap gap-2 p-3 bg-white border-b border-gray-200 rounded-t-xl sticky top-0 z-10 items-center">

            {/* Font Family */}
            <div className="flex items-center border-r border-gray-200 pr-3 mr-2">
                <select
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'default') editor.chain().focus().unsetFontFamily().run();
                        else editor.chain().focus().setFontFamily(val).run();
                        requestAnimationFrame(syncToolbarState);
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
                        requestAnimationFrame(syncToolbarState);
                    }}
                    value={currentFontSize}
                    className="h-9 text-sm border border-gray-300 rounded-lg px-3 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 min-w-20 outline-none cursor-pointer"
                >
                    <option value="">Tamanho</option>
                    {fontSizes.map(size => (
                        <option key={size} value={size}>{size}px</option>
                    ))}
                </select>

                {/* Decrease Font Size Button */}
                <button
                    onClick={() => {
                        const newIndex = getStepIndex(stepFontSize, 'down');
                        const nextSize = fontSizes[newIndex];
                        editor.chain().focus().setFontSize(`${nextSize}px`).run();
                        setLastFontSize(nextSize);
                        requestAnimationFrame(syncToolbarState);
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
                        const newIndex = getStepIndex(stepFontSize, 'up');
                        const nextSize = fontSizes[newIndex];
                        editor.chain().focus().setFontSize(`${nextSize}px`).run();
                        setLastFontSize(nextSize);
                        requestAnimationFrame(syncToolbarState);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Aumentar Fonte"
                >
                    <span className="text-base font-medium">A</span>
                    <span className="text-[10px] align-super">+</span>
                </button>

                <select
                    onChange={(e) => {
                        const val = e.target.value;
                        if (!val) editor.chain().focus().unsetLineHeight().run();
                        else editor.chain().focus().setLineHeight(val).run();
                        requestAnimationFrame(syncToolbarState);
                    }}
                    value={currentLineHeight}
                    className="h-9 text-sm border border-gray-300 rounded-lg px-3 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 min-w-[90px] outline-none cursor-pointer"
                    title="Espaçamento entre linhas"
                >
                    <option value="">Linha</option>
                    {lineHeights.map(size => (
                        <option key={size} value={size}>{size}x</option>
                    ))}
                </select>
            </div>

            <div className="flex gap-1 border-r border-gray-200 pr-2 items-center">
                {/* Preset Colors */}
                {presetColors.map(color => (
                    <button
                        key={color}
                        onClick={() => {
                            editor.chain().focus().setColor(color).run();
                            requestAnimationFrame(syncToolbarState);
                        }}
                        className={`w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform ${currentColorNormalized === normalizeColor(color) ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                        style={{ backgroundColor: color }}
                        title={color}
                    />
                ))}

                {/* Custom Picker */}
                <div className="relative group ml-1">
                    <label htmlFor="color-picker" className={`p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer flex items-center justify-center ${!isPresetColorSelected ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}>
                        <Palette className="w-5 h-5" />
                    </label>
                    <input
                        id="color-picker"
                        type="color"
                        onInput={event => {
                            editor.chain().focus().setColor(event.target.value).run();
                            requestAnimationFrame(syncToolbarState);
                        }}
                        value={currentColorNormalized}
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
                    onClick={() => editor.chain().focus().toggleStarList().run()}
                    className={`p-2 rounded-lg transition-colors ${editor.isActive('starList') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    title="Lista com Estrelas"
                >
                    <Star className="w-5 h-5" />
                </button>
                <button
                    onClick={() => {
                        const textStyle = editor.getAttributes('textStyle');
                        editor
                            .chain()
                            .focus()
                            .toggleOrderedList()
                            .updateAttributes('orderedList', {
                                fontFamily: textStyle.fontFamily || null,
                                fontSize: textStyle.fontSize || null,
                                color: textStyle.color || null,
                                fontWeight: editor.isActive('bold') ? '700' : null,
                            })
                            .run();
                    }}
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

            <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
                <span className="text-[11px] text-gray-500 hidden lg:inline pl-1">Vertical</span>
                {verticalAlignOrder.map((align) => (
                    <button
                        key={align}
                        onClick={() => onChangeVerticalAlign?.(align)}
                        className={`h-9 px-2.5 rounded-lg text-xs font-medium transition-colors ${currentVerticalAlign === align ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
                        title={verticalAlignMeta[align].title}
                    >
                        {verticalAlignMeta[align].label}
                    </button>
                ))}
            </div>

            <div className="flex items-center border-r border-gray-200 pr-2 mr-1 gap-2">
                <button
                    onClick={() => onChangeLogoLayout?.(nextLogoLayout)}
                    className="h-9 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
                    title={`Mudar logo: ${logoLayoutMeta[nextLogoLayout].label}`}
                >
                    MUDAR LOGO
                </button>
                <span className="text-xs text-gray-500 hidden md:inline">
                    {logoLayoutMeta[currentLogoLayout].label}
                </span>
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
                        fontSize: '32px',
                        color: '#00358E'
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
                        fontSize: '32px',
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

export default function Whiteboard({ initialContent, onUpdate, readOnly = false, defaultTitleText = 'TITULO' }) {
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
                                        fontSize: '58px',
                                        color: '#00358E'
                                    }
                                },
                                { type: 'bold' }
                            ],
                            text: defaultTitleText
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

    const [logoLayout, setLogoLayout] = useState(() => {
        const layout = initialContent?.logoLayout;
        return logoLayoutMeta[layout] ? layout : logoLayoutOrder[0];
    });
    const [verticalAlign, setVerticalAlign] = useState(() => {
        const align = initialContent?.verticalAlign;
        return verticalAlignMeta[align] ? align : verticalAlignOrder[0];
    });

    const [activeEditor, setActiveEditor] = useState(null);
    const logoLayoutRef = useRef(logoLayout);
    const verticalAlignRef = useRef(verticalAlign);

    useEffect(() => {
        logoLayoutRef.current = logoLayout;
    }, [logoLayout]);

    useEffect(() => {
        verticalAlignRef.current = verticalAlign;
    }, [verticalAlign]);

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
                },
                bulletList: false, // Disable default bulletList to avoid conflicts
                orderedList: false, // Disable default orderedList to add styled version
            }),
            BulletList, // Explicitly add standard BulletList
            StyledOrderedList,
            TextStyle,
            FontFamily,
            FontSize,
            LineHeight,
            Color,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Highlight.configure({ multicolor: true }),
            StarList,
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
                    body: bodyEditor?.getJSON(),
                    logoLayout: logoLayoutRef.current,
                    verticalAlign: verticalAlignRef.current,
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
            StarterKit.configure({
                bulletList: false, // Disable default bulletList
                orderedList: false, // Disable default orderedList to add styled version
            }),
            BulletList, // Explicitly add standard BulletList
            StyledOrderedList,
            TextStyle,
            FontFamily,
            FontSize,
            LineHeight,
            Color,
            SmartFormatting,
            Highlight.configure({
                multicolor: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            StarList,
        ],
        content: bodyContent,
        onUpdate: ({ editor }) => {
            setBodyContent(editor.getJSON());
            if (onUpdate) {
                onUpdate({
                    title: titleEditor?.getJSON(),
                    body: editor.getJSON(),
                    logoLayout: logoLayoutRef.current,
                    verticalAlign: verticalAlignRef.current,
                });
            }
        },
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'whiteboard-body-editor prose prose-lg max-w-none focus:outline-none h-full min-h-full p-8 leading-snug',
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

    // Handle readOnly prop changes
    useEffect(() => {
        titleEditor?.setEditable(!readOnly);
        bodyEditor?.setEditable(!readOnly);
    }, [readOnly, titleEditor, bodyEditor]);

    const handleChangeLogoLayout = (nextLayout) => {
        const resolvedLayout = logoLayoutMeta[nextLayout] ? nextLayout : logoLayoutOrder[0];
        setLogoLayout(resolvedLayout);
        if (onUpdate) {
            onUpdate({
                title: titleEditor?.getJSON(),
                body: bodyEditor?.getJSON(),
                logoLayout: resolvedLayout,
                verticalAlign: verticalAlignRef.current,
            });
        }
    };

    const handleChangeVerticalAlign = (nextAlign) => {
        const resolvedAlign = verticalAlignMeta[nextAlign] ? nextAlign : verticalAlignOrder[0];
        setVerticalAlign(resolvedAlign);
        if (onUpdate) {
            onUpdate({
                title: titleEditor?.getJSON(),
                body: bodyEditor?.getJSON(),
                logoLayout: logoLayoutRef.current,
                verticalAlign: resolvedAlign,
            });
        }
    };

    const logoConfig = logoLayoutMeta[logoLayout] || logoLayoutMeta[logoLayoutOrder[0]];
    const resolvedVerticalAlign = verticalAlignMeta[verticalAlign] ? verticalAlign : verticalAlignOrder[0];

    if (!titleEditor || !bodyEditor) return <div className="p-10 text-center text-gray-400">Carregando editor...</div>;

    return (
        <div className={`flex flex-col h-full bg-gray-100 overflow-hidden ${readOnly ? 'bg-black flex items-center justify-center' : ''}`}>
            {!readOnly && (
                <MenuBar
                    editor={activeEditor || bodyEditor}
                    logoLayout={logoLayout}
                    onChangeLogoLayout={handleChangeLogoLayout}
                    verticalAlign={verticalAlign}
                    onChangeVerticalAlign={handleChangeVerticalAlign}
                />
            )}

            <div className={`flex-1 w-full overflow-hidden flex items-center justify-center ${readOnly ? '' : 'p-3 md:p-4'}`}>
                <div
                    className={`bg-white shadow-2xl transition-all duration-300 w-full relative flex flex-col ${readOnly ? 'h-auto max-h-full max-w-full' : 'h-auto max-h-full max-w-full'}`}
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
                        className="whiteboard-body flex flex-1 overflow-y-auto relative z-10"
                        data-vertical-align={resolvedVerticalAlign}
                        onClick={() => setActiveEditor(bodyEditor)}
                    >
                        <EditorContent
                            editor={bodyEditor}
                            className="whiteboard-body-content h-full w-full"
                        />
                    </div>

                    {/* Watermark Logo */}
                    <div className={logoConfig.containerClass}>
                        <img
                            src="/logogrande.png"
                            alt="Logo"
                            className={logoConfig.imageClass}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
