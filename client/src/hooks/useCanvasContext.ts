import { createContext, useContext } from "react";
import { useCanvas } from "./useCanvas";

type CanvasContextType = ReturnType<typeof useCanvas>;

export const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const useCanvasContext = (): CanvasContextType => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error(
      "[CanvasContext] Erro: useCanvasContext foi chamado fora do CanvasProvider.\n" +
      "Certifique-se de que o componente esteja envolvido por <CanvasProvider>."
    );
  }
  return context;
};