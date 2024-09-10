import React, { useEffect, useRef } from "react";
import './style.css';
import Tools from "../tools";

const WhiteBoard = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctx = canvasRef.current?.getContext('2d');

    return (
        <div className="white-board">
            <section className="tools-board">
                <Tools />
            </section>
            <section className="drawing-board">
                <canvas ref={canvasRef}></canvas>
            </section>
        </div>
    )
}

export default WhiteBoard;
