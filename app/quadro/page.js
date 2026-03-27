'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Trash2, Edit2, GripVertical, MessageSquare, Eye, EyeOff } from 'lucide-react';
import Whiteboard from '../components/Whiteboard';

const generateId = () => Math.random().toString(36).substr(2, 9);

const extractTextFromNode = (node) => {
    if (!node || typeof node !== 'object') return '';
    if (typeof node.text === 'string') return node.text;
    if (!Array.isArray(node.content)) return '';
    return node.content.map(extractTextFromNode).join(' ');
};

const getTitleFromBoardContent = (content, fallbackTitle) => {
    if (!content || typeof content !== 'object' || !content.title) return fallbackTitle;
    const parsed = extractTextFromNode(content.title).replace(/\s+/g, ' ').trim();
    return parsed || fallbackTitle;
};

export default function QuadroPage() {
    const [boards, setBoards] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dragBoardId, setDragBoardId] = useState(null);
    const [dragOverBoardId, setDragOverBoardId] = useState(null);
    const [messageDayInfo, setMessageDayInfo] = useState(null);
    const dragChangedRef = useRef(false);
    const saveTimeoutRef = useRef(null);
    const titleInputRef = useRef(null);

    // Load boards
    useEffect(() => {
        fetch('/api/whiteboard')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    const normalizedBoards = data.map(board => ({
                        ...board,
                        messageMode: Boolean(board?.messageMode),
                    }));
                    setBoards(normalizedBoards);
                    setSelectedId(normalizedBoards[0].id);
                } else {
                    const newBoard = { id: generateId(), title: 'Quadro 1', content: null, isVisible: true, messageMode: false };
                    setBoards([newBoard]);
                    setSelectedId(newBoard.id);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load boards', err);
                setLoading(false);
            });
    }, []);

    const boardsRef = useRef(boards);
    useEffect(() => {
        boardsRef.current = boards;
    }, [boards]);

    useEffect(() => {
        const selectedBoard = boards.find((b) => b.id === selectedId);
        if (!selectedBoard?.messageMode) return;

        let cancelled = false;
        const loadMessageInfo = async () => {
            try {
                const res = await fetch('/api/message-of-day', { cache: 'no-store' });
                const data = await res.json().catch(() => null);
                if (!cancelled && data?.message) setMessageDayInfo(data);
            } catch {
                // keep previous info on transient errors
            }
        };

        loadMessageInfo();
        const timerId = setInterval(loadMessageInfo, 15 * 60 * 1000);
        return () => { cancelled = true; clearInterval(timerId); };
    }, [boards, selectedId]);

    // Save on unmount
    useEffect(() => {
        return () => {
            if (boardsRef.current.length > 0) {
                fetch('/api/whiteboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(boardsRef.current),
                    keepalive: true,
                }).catch(err => console.error('Unmount save failed', err));
            }
        };
    }, []);

    const saveBoards = (newBoards) => {
        setBoards(newBoards);
        boardsRef.current = newBoards;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            fetch('/api/whiteboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBoards),
            }).catch(err => console.error('Auto-save failed', err));
        }, 1000);
    };

    const createBoard = () => {
        const newBoard = {
            id: generateId(),
            title: `Quadro ${boards.length + 1}`,
            content: null,
            isVisible: true,
            messageMode: false,
        };
        const updated = [...boards, newBoard];
        saveBoards(updated);
        setSelectedId(newBoard.id);
        setTimeout(() => titleInputRef.current?.focus(), 100);
    };

    const deleteBoard = (id, e) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir este quadro?')) {
            const updated = boards.filter(b => b.id !== id);
            if (updated.length === 0) {
                const def = { id: generateId(), title: 'Quadro 1', content: null, isVisible: true, messageMode: false };
                updated.push(def);
            }
            saveBoards(updated);
            if (selectedId === id) setSelectedId(updated[0].id);
        }
    };

    const toggleVisibility = (id, e) => {
        e.stopPropagation();
        const updated = boards.map(b => b.id === id ? { ...b, isVisible: !b.isVisible } : b);
        saveBoards(updated);
    };

    const toggleMessageMode = (id, e) => {
        if (e) e.stopPropagation();
        const updated = boards.map(b => b.id === id ? { ...b, messageMode: !b.messageMode } : b);
        saveBoards(updated);
    };

    const handleRename = (id, e) => {
        e.stopPropagation();
        setSelectedId(id);
        setTimeout(() => titleInputRef.current?.focus(), 100);
    };

    const resetDragState = () => {
        setDragBoardId(null);
        setDragOverBoardId(null);
        dragChangedRef.current = false;
    };

    const handleBoardDragStart = (boardId, e) => {
        setDragBoardId(boardId);
        setDragOverBoardId(boardId);
        dragChangedRef.current = false;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', boardId);
    };

    const reorderBoardsPreview = (sourceId, targetId, placeAfter = false) => {
        if (!sourceId || !targetId || sourceId === targetId) return;
        setBoards(prevBoards => {
            const sourceIndex = prevBoards.findIndex(b => b.id === sourceId);
            const targetIndex = prevBoards.findIndex(b => b.id === targetId);
            if (sourceIndex === -1 || targetIndex === -1) return prevBoards;
            let destinationIndex = targetIndex + (placeAfter ? 1 : 0);
            if (sourceIndex < destinationIndex) destinationIndex -= 1;
            destinationIndex = Math.max(0, Math.min(destinationIndex, prevBoards.length - 1));
            if (sourceIndex === destinationIndex) return prevBoards;
            const updated = [...prevBoards];
            const [moved] = updated.splice(sourceIndex, 1);
            updated.splice(destinationIndex, 0, moved);
            boardsRef.current = updated;
            dragChangedRef.current = true;
            return updated;
        });
    };

    const handleBoardDragOver = (boardId, e) => {
        if (!dragBoardId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragBoardId === boardId) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const placeAfter = e.clientY > rect.top + rect.height / 2;
        setDragOverBoardId(boardId);
        reorderBoardsPreview(dragBoardId, boardId, placeAfter);
    };

    const handleBoardDrop = (e) => {
        e.preventDefault();
        if (dragChangedRef.current) saveBoards([...boardsRef.current]);
        resetDragState();
    };

    const handleBoardDragEnd = () => {
        if (dragChangedRef.current) saveBoards([...boardsRef.current]);
        resetDragState();
    };

    const updateBoardContent = (content) => {
        const updated = boards.map(b =>
            b.id === selectedId
                ? { ...b, content, title: getTitleFromBoardContent(content, b.title) }
                : b
        );
        saveBoards(updated);
    };

    const selectedBoard = boards.find(b => b.id === selectedId);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex items-center gap-3 text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    Carregando quadros…
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">

            {/* ── HEADER ── */}
            <header className="h-[52px] bg-white border-b border-gray-100 px-5 flex items-center gap-3 sticky top-0 z-50 flex-shrink-0">
                <Link
                    href="/"
                    className="w-7 h-7 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
                    title="Voltar para o Painel"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Link>

                <span className="text-[14px] font-medium tracking-tight text-gray-900">
                    Gerenciador de Avisos
                </span>

                <span className="ml-auto text-[11px] font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5">
                    {boards.length} {boards.length === 1 ? 'quadro' : 'quadros'}
                </span>
            </header>

            <div className="flex flex-1 overflow-hidden h-[calc(100vh-52px)]">

                {/* ── SIDEBAR ── */}
                <aside className={`w-[300px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col ${dragBoardId ? 'cursor-grabbing' : ''}`}>

                    {/* New board button */}
                    <div className="p-3 border-b border-gray-100">
                        <button
                            onClick={createBoard}
                            className="w-full h-[34px] flex items-center justify-center gap-2 rounded-lg bg-gray-50 border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Novo Quadro
                        </button>
                    </div>

                    {/* Section label */}
                    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 select-none">
                        Quadros
                    </p>

                    {/* Board list */}
                    <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5 select-none">
                        {boards.map((board, index) => {
                            const isActive = selectedId === board.id;
                            const isDragging = dragBoardId === board.id;
                            const isDragOver = dragOverBoardId === board.id && dragBoardId !== board.id;

                            return (
                                <div
                                    key={board.id}
                                    onClick={() => setSelectedId(board.id)}
                                    onDragOver={(e) => handleBoardDragOver(board.id, e)}
                                    onDrop={handleBoardDrop}
                                    className={`
                                        group relative rounded-lg px-2.5 py-2 cursor-pointer transition-colors duration-100
                                        ${isActive ? 'bg-gray-50' : 'hover:bg-gray-50'}
                                        ${isDragging ? 'opacity-50' : ''}
                                        ${isDragOver ? 'ring-1 ring-blue-300 ring-inset' : ''}
                                    `}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <span className="absolute left-0 top-[6px] bottom-[6px] w-[2px] rounded-r-sm bg-blue-500" />
                                    )}

                                    {/* Top row */}
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {/* Drag handle */}
                                        <button
                                            type="button"
                                            draggable
                                            onDragStart={(e) => { e.stopPropagation(); handleBoardDragStart(board.id, e); }}
                                            onDragEnd={handleBoardDragEnd}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-0.5 rounded"
                                            title="Arraste para reordenar"
                                        >
                                            <GripVertical className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Number */}
                                        <span className={`text-[10px] font-medium w-4 text-center flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                                            {index + 1}
                                        </span>

                                        {/* Title */}
                                        <span className={`truncate text-[13px] font-medium flex-1 ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {board.title}
                                        </span>

                                        {/* Status dot + label */}
                                        {board.isVisible && (
                                            <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                Visível
                                            </span>
                                        )}
                                    </div>

                                    {/* Tags row */}
                                    {(!board.isVisible || board.messageMode) && (
                                        <div className="flex gap-1.5 mt-1.5 pl-[42px]">
                                            {board.messageMode && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                                                    Mensagem
                                                </span>
                                            )}
                                            {!board.isVisible && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                                                    Oculto
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Action buttons — show on hover or active */}
                                    <div className={`flex gap-0.5 mt-1.5 transition-all duration-100 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <button
                                            onClick={(e) => handleRename(board.id, e)}
                                            className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            Renomear
                                        </button>

                                        <button
                                            onClick={(e) => toggleVisibility(board.id, e)}
                                            className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                                        >
                                            {board.isVisible
                                                ? <><EyeOff className="w-3 h-3" />Ocultar</>
                                                : <><Eye className="w-3 h-3" />Mostrar</>
                                            }
                                        </button>

                                        <button
                                            onClick={(e) => deleteBoard(board.id, e)}
                                            className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* ── MAIN CONTENT ── */}
                <main className="flex-1 min-w-0 bg-gray-50 p-5 flex flex-col gap-3">
                    {selectedBoard ? (
                        <>
                            {/* Title row */}
                            <div className="flex items-center gap-3">
                                <input
                                    ref={titleInputRef}
                                    value={selectedBoard.title}
                                    onChange={(e) => {
                                        const updated = boards.map(b =>
                                            b.id === selectedId ? { ...b, title: e.target.value } : b
                                        );
                                        saveBoards(updated);
                                    }}
                                    className="flex-1 text-[20px] font-medium tracking-tight text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 px-0 py-1 transition-colors placeholder-gray-300"
                                    placeholder="Título do quadro"
                                />

                                {/* Message mode pill */}
                                <button
                                    onClick={() => toggleMessageMode(selectedBoard.id)}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                                        selectedBoard.messageMode
                                            ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                                    }`}
                                    title={selectedBoard.messageMode ? 'Desativar modo mensagem' : 'Ativar modo mensagem'}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedBoard.messageMode ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Modo Mensagem
                                </button>
                            </div>

                            {/* Message of the day banner */}
                            {selectedBoard.messageMode && messageDayInfo?.message && (
                                <div className="flex items-baseline gap-3 bg-blue-50 border border-blue-100 rounded-lg px-3.5 py-2.5 text-[12px] text-blue-800">
                                    <span>
                                        <strong className="font-semibold">Hoje</strong>
                                        {' — '}#{messageDayInfo.message.id} {messageDayInfo.message.referencia}
                                    </span>
                                    <span className="text-blue-300 select-none">·</span>
                                    <span>
                                        <strong className="font-semibold">{messageDayInfo.nextWeekDay}</strong>
                                        {' — '}#{messageDayInfo.nextMessage?.id ?? '–'} {messageDayInfo.nextMessage?.referencia ?? '–'}
                                    </span>
                                </div>
                            )}

                            {/* Editor area */}
                            <div className="flex-1 min-h-0 relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                {/* Visibility badge — inside editor top-right */}
                                <div className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border ${
                                    selectedBoard.isVisible
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-gray-100 text-gray-500 border-gray-200'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${selectedBoard.isVisible ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                                    {selectedBoard.isVisible ? 'Visível no painel' : 'Oculto do painel'}

                                    {/* Inline toggle */}
                                    <button
                                        onClick={(e) => toggleVisibility(selectedBoard.id, e)}
                                        className="ml-1 text-[10px] underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
                                    >
                                        {selectedBoard.isVisible ? 'Ocultar' : 'Mostrar'}
                                    </button>
                                </div>

                                <Whiteboard
                                    key={selectedBoard.id}
                                    initialContent={selectedBoard.content}
                                    defaultTitleText={selectedBoard.title}
                                    onUpdate={updateBoardContent}
                                    readOnly={selectedBoard.messageMode}
                                    messageMode={selectedBoard.messageMode}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center text-[13px] text-gray-400">
                            Selecione um quadro na barra lateral
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}