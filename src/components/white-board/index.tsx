import React, { useEffect, useRef } from "react";
import './style.css';
import Tools from "../tools";

// Drawing state
let drawingHistory = [];
let redoHistory = [];
let currentStep = 0;
let isDrawing = false;
let brushSize = 5;
let selectedColor = "#000";
let selectedTool = "brush";
let prevMousePoint = { x: 0, y: 0 };
let canvasSnapshot = null;

const WhiteBoard = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        initCanvas();
    }, []);

    const initCanvas = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (canvasRef.current === null || !ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        canvasRef.current.width = canvasRect.width * dpr;
        canvasRef.current.height = canvasRect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    // Reset Canvas
    const resetCanvas = () => {
        initCanvas();
        const ctx = canvasRef.current?.getContext('2d');
        if (canvasRef.current === null || !ctx) return;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        drawingHistory.push(localStorage.getItem("savedDrawing") || canvasRef.current.toDataURL());
    };

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
