import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Loader2 } from 'lucide-react';

interface WritingPanelProps {
  open: boolean;
  onClose: () => void;
  content: string; // Contenido inicial en Markdown
}

export function WritingPanel({ open, onClose, content: initialMarkdownContent }: WritingPanelProps) {
  const [currentTipTapContent, setCurrentTipTapContent] = useState(''); // Almacenará HTML para TipTap
  const [selectedText, setSelectedText] = useState(''); // Texto plano de la selección actual
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingLoading, setIsEditingLoading] = useState(false);
  
  const selectedRangeRef = useRef<Range | null>(null); // Para guardar el Rango DOM de la selección

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configurar para que siempre haya un párrafo inicial
        paragraph: {
          keepMarks: true,
          keepAttributes: true,
        },
      }),
    ],
    content: currentTipTapContent || '<p></p>', // Asegurar un párrafo inicial
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      // Actualizar el estado si se quiere sincronizar con el padre o guardar
      // setCurrentTipTapContent(editor.getHTML()); // Podría causar bucles si no se maneja con cuidado
    },
    onSelectionUpdate: ({ editor }) => {
      const { empty, from, to } = editor.state.selection;
      if (!empty) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        setSelectedText(text); // Guardar el texto plano seleccionado
        setPopoverVisible(true); 
      } else {
        setSelectedText('');
        setPopoverVisible(false);
      }
    },
  });

  // Asegurar que el editor tenga un párrafo inicial cuando se monte
  useEffect(() => {
    if (editor && !editor.getText().trim()) {
      editor.commands.setContent('<p></p>');
      editor.commands.focus('end');
    }
  }, [editor]);

  // Sincronizar initialMarkdownContent (Markdown) con el contenido del editor TipTap (HTML)
  useEffect(() => {
    if (editor) {
      let htmlToSet = '';
      if (window.marked && typeof window.marked.parse === 'function') {
        htmlToSet = window.marked.parse(initialMarkdownContent || '', { breaks: true, gfm: true });
      } else {
        htmlToSet = initialMarkdownContent || ''; // Fallback a texto plano
      }
      // Solo actualizar si el contenido es realmente diferente para evitar perder el estado del editor
      if (editor.getHTML() !== htmlToSet) {
        editor.commands.setContent(htmlToSet, false);
      }
    }
  }, [initialMarkdownContent, editor]);


  const sendEditRequest = async () => {
    if (!editPrompt.trim() || !selectedText.trim() || !editor) {
      console.warn("[Tiptap SendEdit] No edit prompt, selected text, or editor instance.");
      setIsEditingLoading(false);
      setPopoverVisible(false);
      return;
    }

    // Usar la selección actual del editor para 'from' y 'to'
    const { from, to, empty } = editor.state.selection;

    if (empty) {
        console.warn("[Tiptap SendEdit] Selection is empty at the moment of sending request. Aborting.");
        setIsEditingLoading(false);
        setEditPrompt('');
        setPopoverVisible(false);
        return;
    }

    setIsEditingLoading(true);
    setPopoverVisible(false); 

    const body = {
      chatInput: `Instrucción: "${editPrompt}". Texto original: """${selectedText}""". Devuelve ÚNICAMENTE el texto modificado resultante.`,
    };

    try {
      const res = await fetch("http://localhost:7000/mcp", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Error en la respuesta del servidor de edición');
      
      const data = await res.json();
      let newTextFromLLM = "Error al procesar la edición.";
      // ... (lógica para extraer newTextFromLLM de data, igual que antes)
      if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0].output === 'string') {
        newTextFromLLM = data[0].output;
      } else if (data && typeof data === 'object') {
        if (typeof data.reply === 'string') newTextFromLLM = data.reply;
        else if (typeof data.text === 'string') newTextFromLLM = data.text;
        else if (typeof data.output === 'string') newTextFromLLM = data.output;
      } else if (typeof data === 'string') {
        newTextFromLLM = data;
      }

      // Limpiar comillas del principio y del final si existen
      if (typeof newTextFromLLM === 'string') {
        let cleanedText = newTextFromLLM.trim();
        if (cleanedText.startsWith('"') && cleanedText.endsWith('"')) {
          cleanedText = cleanedText.substring(1, cleanedText.length - 1);
        }
        newTextFromLLM = cleanedText;
      }
      
      const newHtmlToInsert = window.marked && typeof window.marked.parse === 'function'
                              ? window.marked.parse(newTextFromLLM || '', { breaks: true, gfm: true })
                              : newTextFromLLM;

      console.log(`[Tiptap SendEdit] Replacing range from: ${from}, to: ${to} with HTML:`, newHtmlToInsert);
      editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContent(newHtmlToInsert).run();

    } catch (error) {
      console.error("Error al editar texto:", error);
    } finally {
      setIsEditingLoading(false);
      setEditPrompt('');
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="w-1/2 h-full bg-gray-900 border-t border-l border-b border-gray-600 shadow-2xl z-50 flex flex-col rounded-l-xl relative">
      <div className="p-6 flex justify-between items-center mb-0">
        <h2 className="text-xl font-semibold text-white">Redacción Asistida</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-2xl"
          aria-label="Cerrar panel de redacción"
        >
          &times;
        </button>
      </div>

      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100, placement: 'bottom-start' }}
          className="bg-gray-700 shadow-xl rounded-md border border-gray-600 z-[70]"
          shouldShow={({ editor: currentEditor, state }) => {
            if (!currentEditor || !state) return false;
            return !state.selection.empty;
          }}
        >
          <div className="p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Texto seleccionado:</span>
              <button
                onClick={() => {
                  setPopoverVisible(false);
                  setEditPrompt('');
                }}
                className="text-gray-400 hover:text-white transition-colors text-sm"
                aria-label="Cerrar menú"
              >
                ×
              </button>
            </div>
            <div className="bg-gray-700/50 rounded-md p-2 text-gray-300 text-sm overflow-hidden">
              <p className="whitespace-pre-wrap break-words">{selectedText}</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Ej: 'hazlo más formal'"
                value={editPrompt}
                onChange={e => setEditPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') sendEditRequest();
                  if (e.key === 'Escape') {
                    setPopoverVisible(false);
                    setEditPrompt('');
                  }
                }}
                className="flex-grow p-1.5 rounded-md bg-gray-800 text-white border border-gray-600 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
              />
              {isEditingLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
              ) : (
                <button 
                  onClick={sendEditRequest} 
                  className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  disabled={!editPrompt.trim()}
                >
                  Aplicar
                </button>
              )}
            </div>
          </div>
        </BubbleMenu>
      )}

      <div className="relative flex-grow flex flex-col min-h-0 p-6 pt-0">
        <EditorContent 
          editor={editor} 
          className="flex-grow w-full h-full bg-gray-800 border border-gray-700 rounded-lg p-4 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 prose dark:prose-invert prose-sm max-w-none"
        />
      </div>

      <div className="p-6 pt-0 flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}