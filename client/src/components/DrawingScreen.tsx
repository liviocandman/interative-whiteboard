import Canvas from "./Canvas";
import { CanvasProvider } from '../providers/CanvasContext'
import Toolbar from "./Toolbar"; 

export default function DrawingScreen() {

  return (
    <div >
      <CanvasProvider style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Toolbar />
        <Canvas width={window.innerWidth} height={window.innerHeight - 60} />
      </CanvasProvider>
    </div>
  );
}
