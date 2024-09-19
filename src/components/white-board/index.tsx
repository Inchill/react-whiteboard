import React, { useEffect, useRef, useState } from "react";
import './style.css';
import Tools from "../tools";

// Drawing state
let drawingHistory: string[] = [];
let redoHistory: string[] = [];
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

    // 保存白板绘画信息
    const saveDrawingToLocalstorage = () => {
        const canvas = canvasRef.current;
        const canvasDrawing = canvas!.toDataURL();
        localStorage.setItem("savedDrawing", canvasDrawing);
    }

    // 保存每一步的数据
    const saveDrawingState = () => {
        const canvas = canvasRef.current;
        if (currentStep < drawingHistory.length - 1) {
            drawingHistory = drawingHistory.slice(0, currentStep + 1);
        }
        currentStep++;
        drawingHistory.push(canvas!.toDataURL());
        redoHistory = [];
        saveDrawingToLocalstorage();
    }

    // 处理撤销和恢复
    const handleUndoRedo = (selectedBtn: HTMLLIElement) => {
        if (selectedBtn.id === "undo" && currentStep > 0) {
            currentStep--;
            redoHistory.push(drawingHistory[currentStep + 1]);
        } else if (selectedBtn.id === "redo" && redoHistory.length > 0) {
            currentStep++;
            const redoItem = redoHistory.pop();
            if (redoItem) {
                drawingHistory.push(redoItem);
            }
        } else {
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas === null || !ctx) return;
    
        const image = new Image();
        image.src = drawingHistory[currentStep];
        image.onload = () => {
            const size = getImageSize(image);
            if (size) {
                const { newWidth, newHeight } = size;
                ctx.drawImage(image, 0, 0, newWidth, newHeight);
                saveDrawingToLocalstorage();
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
