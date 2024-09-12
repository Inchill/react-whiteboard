import React, { useEffect, useRef } from "react";
import './style.css';
import Tools from "../tools";

const WhiteBoard = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const initCanvas = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (canvasRef.current === null || !ctx) return;
            console.log(canvasRef.current);
            const dpr = window.devicePixelRatio || 1;
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            canvasRef.current.width = canvasRect.width * dpr;
            canvasRef.current.height = canvasRect.height * dpr;
            ctx.scale(dpr, dpr);
        }
        initCanvas();
    }, []);

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
