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
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas === null || !ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const canvasRect = canvas?.getBoundingClientRect();
        canvas.width = canvasRect.width * dpr;
        canvas.height = canvasRect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    // Reset Canvas
    const resetCanvas = () => {
        initCanvas();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas === null || !ctx) return;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawingHistory.push(localStorage.getItem("savedDrawing") || canvas.toDataURL());
    };

    const getImageSize = (image: HTMLImageElement) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas === null || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const canvasRect = canvas.getBoundingClientRect();
        const aspectRatio = image.width / image.height;
        const newWidth = canvasRect.width;
        const newHeight = newWidth / aspectRatio;
        return { newWidth, newHeight };
    };

    const loadLocalstorageDrawing = () => {
        const savedDrawing = localStorage.getItem("savedDrawing");
        if (!savedDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas === null || !ctx) return;
    
        const image = new Image();
        image.src = savedDrawing;
        image.onload = () => {
            const size = getImageSize(image);
            if (size) {
                const { newWidth, newHeight } = size;
                ctx.drawImage(image, 0, 0, newWidth, newHeight);
            }
        }
    }

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
