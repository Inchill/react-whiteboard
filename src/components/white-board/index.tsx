import React from "react";
import './style.css';
import Tools from "../tools";

const WhiteBoard = () => {
    return (
        <div className="container">
            <Tools />
            <section className="drawing-board">
                <canvas></canvas>
            </section>
        </div>
    )
}

export default WhiteBoard;
