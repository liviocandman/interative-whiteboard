import { useCallback, useRef, useState, useEffect } from "react";

interface UseHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  saveState: () => void;
  clearHistory: () => void;
}

/**
 * Hook para histórico de canvas (undo/redo) baseado em dataURLs.
 *
 * @param canvasRef - ref do <canvas> HTML
 * @param maxHistory - número máximo de estados a manter no undo stack
 */
export function useHistory(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  maxHistory: number = 20
): UseHistoryReturn {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  const saveState = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataURL = canvas.toDataURL();
      // evita duplicar estado idêntico consecutivo
      const last = undoStack.current[undoStack.current.length - 1];
      if (last !== dataURL) {
        undoStack.current.push(dataURL);
        if (undoStack.current.length > maxHistory) {
          undoStack.current.shift();
        }
      }

      // nova ação invalida redo
      redoStack.current = [];

      setCanUndo(undoStack.current.length > 0);
      setCanRedo(false);
    } catch (error) {
      console.error("useHistory.saveState failed:", error);
    }
  }, [canvasRef, maxHistory]);

  const undo = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (undoStack.current.length === 0) return;

    try {
      // Move estado atual para redo
      const currentState = canvas.toDataURL();
      redoStack.current.push(currentState);

      // Pega último estado do undo stack (o que vamos restaurar)
      const prevState = undoStack.current.pop();
      if (!prevState) {
        setCanUndo(false);
        setCanRedo(redoStack.current.length > 0);
        return;
      }

      const img = new Image();
      img.onload = (): void => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = prevState;

      setCanUndo(undoStack.current.length > 0);
      setCanRedo(redoStack.current.length > 0);
    } catch (error) {
      console.error("useHistory.undo failed:", error);
    }
  }, [canvasRef]);

  const redo = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (redoStack.current.length === 0) return;

    try {
      // Salva estado atual no undo stack
      const currentState = canvas.toDataURL();
      undoStack.current.push(currentState);
      if (undoStack.current.length > maxHistory) {
        undoStack.current.shift();
      }

      // Restaura estado do redo stack
      const nextState = redoStack.current.pop();
      if (!nextState) {
        setCanUndo(undoStack.current.length > 0);
        setCanRedo(false);
        return;
      }

      const img = new Image();
      img.onload = (): void => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = nextState;

      setCanUndo(undoStack.current.length > 0);
      setCanRedo(redoStack.current.length > 0);
    } catch (error) {
      console.error("useHistory.redo failed:", error);
    }
  }, [canvasRef, maxHistory]);

  const clearHistory = useCallback((): void => {
    undoStack.current = [];
    redoStack.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // não incluí undo/redo/saveState nos deps para evitar re-register em cada render
    // as funções são estáveis porque são memoizadas por useCallback
  }, [undo, redo]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    saveState,
    clearHistory,
  };
}
