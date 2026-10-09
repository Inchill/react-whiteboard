import { act, createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Whiteboard, type WhiteboardHandle } from '../src/whiteboard/Whiteboard';
import type { Shape } from '../src/whiteboard/types';

const line: Shape = { id: 'l1', type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, color: 'ink', strokeWidth: 2, strokeStyle: 'solid' };

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('<Whiteboard />', () => {
    it('renders the toolbar with the initial tool active', () => {
        render(<Whiteboard storageKey={null} locale="en" />);
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pen' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Pick a tool and start drawing')).toBeInTheDocument();
    });

    it('switches tools with keyboard shortcuts', () => {
        render(<Whiteboard storageKey={null} locale="en" />);
        fireEvent.keyDown(window, { key: 'r' });
        expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.keyDown(window, { key: '1' });
        expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('only listens on its own element when globalShortcuts is false', () => {
        const { container } = render(<Whiteboard storageKey={null} locale="en" globalShortcuts={false} />);
        fireEvent.keyDown(window, { key: 'r' });
        expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveAttribute('aria-pressed', 'false');
        fireEvent.keyDown(container.querySelector('.rwb-root')!, { key: 'r' });
        expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('exposes an imperative API with undo/redo', () => {
        const ref = createRef<WhiteboardHandle>();
        const onChange = vi.fn();
        render(<Whiteboard ref={ref} storageKey={null} locale="en" onChange={onChange} />);
        act(() => ref.current!.setShapes([line]));
        expect(ref.current!.getShapes()).toEqual([line]);
        expect(onChange).toHaveBeenLastCalledWith([line]);
        expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
        act(() => ref.current!.undo());
        expect(ref.current!.getShapes()).toEqual([]);
        act(() => ref.current!.redo());
        expect(ref.current!.getShapes()).toEqual([line]);
        expect(ref.current!.exportSvg()).toContain('<line');
        expect(JSON.parse(ref.current!.exportJson()).shapes).toHaveLength(1);
    });

    it('selects all and deletes with the keyboard', () => {
        const ref = createRef<WhiteboardHandle>();
        render(<Whiteboard ref={ref} storageKey={null} locale="en" initialShapes={[line]} />);
        fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Delete' });
        expect(ref.current!.getShapes()).toEqual([]);
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        expect(ref.current!.getShapes()).toEqual([line]);
    });

    it('autosaves to and restores from localStorage', () => {
        vi.useFakeTimers();
        const ref = createRef<WhiteboardHandle>();
        const { unmount } = render(<Whiteboard ref={ref} storageKey="test-board" locale="en" />);
        act(() => ref.current!.setShapes([line]));
        act(() => vi.advanceTimersByTime(500));
        unmount();
        expect(localStorage.getItem('test-board')).toBeTruthy();

        const ref2 = createRef<WhiteboardHandle>();
        render(<Whiteboard ref={ref2} storageKey="test-board" locale="en" />);
        expect(ref2.current!.getShapes()).toEqual([line]);
    });

    it('shows only the configured tools, numbered in order', () => {
        render(<Whiteboard storageKey={null} locale="en" tools={['pen', 'highlighter', 'eraser']} initialTool="rect" />);
        const toolbar = screen.getByRole('toolbar');
        expect(toolbar.querySelectorAll('button')).toHaveLength(3);
        // initialTool not in the list falls back to the first tool.
        expect(screen.getByRole('button', { name: 'Pen' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByRole('button', { name: 'Rectangle' })).toBeNull();
        fireEvent.keyDown(window, { key: '3' });
        expect(screen.getByRole('button', { name: 'Eraser' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.keyDown(window, { key: 'r' });
        expect(screen.getByRole('button', { name: 'Eraser' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows eraser options for the eraser and pressure for the pen', () => {
        render(<Whiteboard storageKey={null} locale="en" />);
        expect(screen.getByLabelText('Pressure & speed')).toBeChecked();
        fireEvent.keyDown(window, { key: 'e' });
        expect(screen.getByRole('button', { name: 'Rub out' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Whole stroke' }));
        expect(screen.getByRole('button', { name: 'Whole stroke' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByLabelText('Eraser size')).toHaveValue('12');
    });

    it('opens the menu and the shortcuts dialog', () => {
        render(<Whiteboard storageKey={null} locale="zh" />);
        fireEvent.click(screen.getByRole('button', { name: '菜单' }));
        fireEvent.click(screen.getByRole('menuitem', { name: /快捷键/ }));
        expect(screen.getByRole('dialog', { name: '快捷键' })).toBeInTheDocument();
    });
});
