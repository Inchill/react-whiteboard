import React from "react";
import './style.css';
import Tools from "../tools";

const WhiteBoard = () => {
    return (
        <div className="white-board">
            <section className="tools-board">
                <Tools />
            </section>
            <section className="drawing-board">
                <canvas></canvas>
            </section>
        </div>
    )
}

export default WhiteBoard;
