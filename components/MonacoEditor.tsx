'use client';

import { useEffect, useRef } from 'react';
import { devError } from '@/lib/client-log';

interface MonacoEditorProps {
    code: string;
    language?: string;
    theme?: string;
    readOnly?: boolean;
    onChange?: (value: string) => void;
}

export default function MonacoEditor({
    code,
    language = 'html',
    theme = 'vs-dark',
    readOnly = true,
    onChange,
}: MonacoEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const monacoRef = useRef<any>(null);

    useEffect(() => {
        // Dynamically load Monaco Editor
        const loadMonaco = async () => {
            if (typeof window !== 'undefined') {
                try {
                    // @ts-ignore
                    const monaco = await import('monaco-editor');

                    if (editorRef.current && !monacoRef.current) {
                        monacoRef.current = monaco.editor.create(editorRef.current, {
                            value: code,
                            language: language,
                            theme: theme,
                            readOnly: readOnly,
                            minimap: { enabled: true },
                            fontSize: 14,
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            wordWrap: 'on',
                            folding: true,
                            renderWhitespace: 'selection',
                            bracketPairColorization: {
                                enabled: true,
                            },
                        });

                        if (onChange && !readOnly) {
                            monacoRef.current.onDidChangeModelContent(() => {
                                onChange(monacoRef.current.getValue());
                            });
                        }
                    }
                } catch (error) {
                    devError('Failed to load Monaco Editor', error);
                }
            }
        };

        loadMonaco();

        return () => {
            if (monacoRef.current) {
                monacoRef.current.dispose();
                monacoRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (monacoRef.current && code !== monacoRef.current.getValue()) {
            monacoRef.current.setValue(code);
        }
    }, [code]);

    return (
        <div
            ref={editorRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
        />
    );
}
