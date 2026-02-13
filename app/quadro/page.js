'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Trash2, Layout, Edit2, ArrowUp, ArrowDown } from 'lucide-react';
import Whiteboard from '../components/Whiteboard';

// Simple ID generator if uuid not available
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
    const saveTimeoutRef = useRef(null);
    const titleInputRef = useRef(null);

    // Load boards
    useEffect(() => {
        fetch('/api/whiteboard')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setBoards(data);
                    setSelectedId(data[0].id);
                } else {
                    // Should not happen due to API default, but handle empty
                    const newBoard = { id: generateId(), title: 'Quadro 1', content: null, isVisible: true };
                    setBoards([newBoard]);
                    setSelectedId(newBoard.id);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load boards", err);
                setLoading(false);
            });
    }, []);

    const boardsRef = useRef(boards);
    useEffect(() => {
        boardsRef.current = boards;
    }, [boards]);

    // Save on unmount
    useEffect(() => {
        return () => {
            if (boardsRef.current.length > 0) {
                // Use fetch with keepalive to ensure it completes
                fetch('/api/whiteboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(boardsRef.current),
                    keepalive: true
                }).catch(err => console.error("Unmount save failed", err));
            }
        };
    }, []);

    // Save boards to API (debounced)
    const saveBoards = (newBoards) => {
        setBoards(newBoards);
        // Update ref immediately for safety
        boardsRef.current = newBoards;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            fetch('/api/whiteboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBoards),
            }).catch(err => console.error("Auto-save failed", err));
        }, 1000); // Debounce global save
    };

    const createBoard = () => {
        const newBoard = {
            id: generateId(),
            title: `Quadro ${boards.length + 1}`,
            content: null,
            isVisible: true
        };
        const updated = [...boards, newBoard];
        saveBoards(updated);
        setSelectedId(newBoard.id);
        // Focus title after creation
        setTimeout(() => titleInputRef.current?.focus(), 100);
    };

    const deleteBoard = (id, e) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir este quadro?')) {
            const updated = boards.filter(b => b.id !== id);
            if (updated.length === 0) {
                // Create default if all deleted
                const def = { id: generateId(), title: 'Quadro 1', content: null, isVisible: true };
                updated.push(def);
            }
            saveBoards(updated);
            // If deleted selected, switch
            if (selectedId === id) {
                setSelectedId(updated[0].id);
            }
        }
    };

    const toggleVisibility = (id, e) => {
        e.stopPropagation();
        const updated = boards.map(b => {
            if (b.id === id) return { ...b, isVisible: !b.isVisible };
            return b;
        });
        saveBoards(updated);
    };

    const handleRename = (id, e) => {
        e.stopPropagation();
        setSelectedId(id);
        setTimeout(() => titleInputRef.current?.focus(), 100);
    };

    const moveBoard = (id, direction, e) => {
        e.stopPropagation();

        const currentIndex = boards.findIndex(board => board.id === id);
        if (currentIndex === -1) return;

        const targetIndex = currentIndex + direction;
        if (targetIndex < 0 || targetIndex >= boards.length) return;

        const updated = [...boards];
        const [moved] = updated.splice(currentIndex, 1);
        updated.splice(targetIndex, 0, moved);
        saveBoards(updated);
    };

    const updateBoardContent = (content) => {
        const updated = boards.map(b => {
            if (b.id === selectedId) {
                return {
                    ...b,
                    content,
                    title: getTitleFromBoardContent(content, b.title),
                };
            }
            return b;
        });
        saveBoards(updated);
    };

    const selectedBoard = boards.find(b => b.id === selectedId);

    if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                        title="Voltar para o Painel"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Gerenciador de Avisos</h1>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden h-[calc(100vh-80px)]">
                {/* Sidebar */}
                <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                        <button
                            onClick={createBoard}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            <Plus className="w-4 h-4" /> Novo Quadro
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {boards.map((board, index) => (
                            <div
                                key={board.id}
                                onClick={() => setSelectedId(board.id)}
                                className={`group flex flex-col p-3 rounded-lg cursor-pointer transition-all duration-200 ${selectedId === board.id
                                    ? 'bg-blue-50 border-blue-300 border shadow-sm'
                                    : 'hover:bg-gray-100 border border-transparent hover:border-gray-200'}`}
                            >
                                {/* Board Info Row */}
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${selectedId === board.id ? 'text-blue-700' : 'text-gray-400'}`}>
                                        {index + 1}
                                    </span>
                                    <Layout className={`w-5 h-5 flex-shrink-0 transition-colors ${selectedId === board.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    <span className={`truncate font-medium transition-colors ${selectedId === board.id ? 'text-blue-900' : 'text-gray-700'}`}>
                                        {board.title}
                                    </span>
                                    {/* Visibility Badge */}
                                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${board.isVisible
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-200 text-gray-500'}`}>
                                        {board.isVisible ? 'Visível' : 'Oculto'}
                                    </span>
                                </div>

                                {/* Action Buttons Row - Always visible on selected, hover on others */}
                                <div className={`flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-gray-100 transition-all duration-200 ${selectedId === board.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    {/* Order Buttons */}
                                    <button
                                        onClick={(e) => moveBoard(board.id, -1, e)}
                                        disabled={index === 0}
                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                        title="Mover para cima"
                                    >
                                        <ArrowUp className="w-3.5 h-3.5" />
                                        <span>Subir</span>
                                    </button>

                                    <button
                                        onClick={(e) => moveBoard(board.id, 1, e)}
                                        disabled={index === boards.length - 1}
                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                        title="Mover para baixo"
                                    >
                                        <ArrowDown className="w-3.5 h-3.5" />
                                        <span>Descer</span>
                                    </button>

                                    {/* Rename Button */}
                                    <button
                                        onClick={(e) => handleRename(board.id, e)}
                                        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors shrink-0"
                                        title="Clique para editar o título do quadro"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>Renomear</span>
                                    </button>

                                    {/* Toggle Visibility Button */}
                                    <button
                                        onClick={(e) => toggleVisibility(board.id, e)}
                                        className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-colors shrink-0 ${board.isVisible
                                            ? 'text-green-700 hover:bg-green-100'
                                            : 'text-gray-500 hover:bg-gray-200'}`}
                                        title={board.isVisible ? "Clique para ocultar do painel TV" : "Clique para mostrar no painel TV"}
                                    >
                                        <div className={`w-2.5 h-2.5 rounded-full ${board.isVisible ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        <span>{board.isVisible ? 'Ocultar' : 'Mostrar'}</span>
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => deleteBoard(board.id, e)}
                                        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
                                        title="Clique para excluir este quadro permanentemente"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Excluir</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 bg-gray-50 p-6 flex flex-col min-w-0">
                    {selectedBoard ? (
                        <div className="flex flex-col h-full space-y-4">
                            {/* Board Title Input */}
                            <div className="flex items-center gap-2 group/title">
                                <input
                                    ref={titleInputRef}
                                    value={selectedBoard.title}
                                    onChange={(e) => {
                                        const updated = boards.map(b => {
                                            if (b.id === selectedId) return { ...b, title: e.target.value };
                                            return b;
                                        });
                                        saveBoards(updated);
                                    }}
                                    className="text-2xl font-bold bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-2 py-1 focus:ring-2 focus:ring-blue-100 text-gray-800 placeholder-gray-400 w-full transition-all outline-none"
                                    placeholder="Título do Quadro"
                                />
                                <Edit2 className="w-5 h-5 text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                            </div>

                            <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* 
                           We key by ID to force remount when switching boards 
                           This resets internal editor state while passing new initialContent 
                        */}
                                <Whiteboard
                                    key={selectedBoard.id}
                                    initialContent={selectedBoard.content}
                                    defaultTitleText={selectedBoard.title}
                                    onUpdate={updateBoardContent}
                                    readOnly={false}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                            Selecione um quadro
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
